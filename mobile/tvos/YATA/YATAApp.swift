import SwiftUI
import AVKit

@main
struct YATAApp: App {
    var body: some Scene { WindowGroup { LibraryView() } }
}

struct LibraryView: View {
    @StateObject private var catalog = CatalogStore()
    @State private var query = ""

    var filteredShows: [Show] {
        catalog.shows.filter { query.isEmpty || $0.title.localizedCaseInsensitiveContains(query) }
            .sorted { $0.title.localizedStandardCompare($1.title) == .orderedAscending }
    }

    var body: some View {
        TabView {
            NavigationStack {
                List {
                    Section {
                        ForEach(filteredShows) { show in
                            NavigationLink(value: show.id) {
                                VStack(alignment: .leading) {
                                    Text(show.title).font(.headline)
                                    Text("\(show.episodes.count) episodes · \(show.channel.capitalized)")
                                        .font(.caption).foregroundStyle(.secondary)
                                }
                            }
                        }
                    } header: { Text(catalog.status) }
                    Button("Refresh catalog") { Task { await catalog.load() } }
                }
                .searchable(text: $query, prompt: "Find a show")
                .navigationTitle("YATA")
                .navigationDestination(for: String.self) { id in
                    if let show = catalog.shows.first(where: { $0.id == id }) { EpisodesView(show: show) }
                }
            }
            .tabItem { Label("Library", systemImage: "tv") }
            AboutView().tabItem { Label("About", systemImage: "info.circle") }
        }
        .tint(.orange)
        .task { await catalog.load() }
    }
}

struct EpisodesView: View {
    let show: Show
    @State private var selected: Episode?

    var body: some View {
        List(show.episodes) { episode in
            Button { selected = episode } label: {
                VStack(alignment: .leading) {
                    Text(episode.title)
                    if episode.playableURL == nil {
                        Text("This provider is not available in the Apple TV player.")
                            .font(.caption).foregroundStyle(.secondary)
                    }
                }
            }
            .disabled(episode.playableURL == nil)
        }
        .navigationTitle(show.title)
        .fullScreenCover(item: $selected) { episode in
            if let url = episode.playableURL { PlayerView(url: url) }
        }
    }
}

struct PlayerView: View {
    @State private var player: AVPlayer

    init(url: URL) { _player = State(initialValue: AVPlayer(url: url)) }

    var body: some View {
        VideoPlayer(player: player)
            .ignoresSafeArea()
            .onAppear {
                try? AVAudioSession.sharedInstance().setCategory(.playback, mode: .moviePlayback)
                try? AVAudioSession.sharedInstance().setActive(true)
                player.play()
            }
            .onDisappear {
                player.pause()
                try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
            }
    }
}

struct AboutView: View {
    var body: some View {
        NavigationStack {
            List {
                Text("YATA — It’s probably a rerun.").font(.title)
                Text("Created by Drew Schillinger")
                Text("Video belongs to its respective creators and rights holders. Streams are supplied by Internet Archive; availability varies.")
                Text("Source, attribution and release notes are available at the addresses below.")
                Text("https://github.com/doctor-ew/yata")
                Text("https://github.com/doctor-ew/yata/blob/main/ATTRIBUTION.md")
                Text("https://github.com/doctor-ew/yata/blob/main/CHANGELOG.md")
                NavigationLink("Licenses and attribution") {
                    ScrollView {
                        Text(notices).font(.caption).padding(60)
                    }
                }
            }.navigationTitle("About YATA")
        }
    }

    private var notices: String {
        ["LICENSE", "ATTRIBUTION.md"].compactMap { name in
            guard let url = Bundle.main.resourceURL?.appendingPathComponent("Notices/\(name)") else { return nil }
            return try? String(contentsOf: url, encoding: .utf8)
        }.joined(separator: "\n\n")
    }
}
