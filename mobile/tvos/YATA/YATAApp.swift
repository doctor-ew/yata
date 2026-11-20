import SwiftUI
import AVKit

@main
struct YATAApp: App {
    var body: some Scene { WindowGroup { LibraryView() } }
}

struct LibraryView: View {
    @StateObject private var catalog = CatalogStore()
    @State private var query = ""
    @State private var tab = "watch"

    var filteredShows: [Show] {
        catalog.shows.filter { query.isEmpty || $0.title.localizedCaseInsensitiveContains(query) }
            .sorted { $0.title.localizedStandardCompare($1.title) == .orderedAscending }
    }

    var body: some View {
        TabView(selection: $tab) {
            WatchView(catalog: catalog, active: tab == "watch")
                .tabItem { Label("Watch", systemImage: "play.tv") }.tag("watch")
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
            .tabItem { Label("Library", systemImage: "tv") }.tag("library")
            AboutView().tabItem { Label("About", systemImage: "info.circle") }.tag("about")
        }
        .tint(.orange)
        .task { await catalog.load() }
    }
}

struct WatchView: View {
    @ObservedObject var catalog: CatalogStore
    let active: Bool
    @AppStorage("yata.tv.lastChannel") private var lastChannel = "mixed"
    @State private var selected = "mixed"
    @State private var playlist: [Episode] = []
    @State private var index = 0
    @State private var player = AVPlayer()
    @State private var started = false
    @State private var playbackError = false

    var body: some View {
        VStack(spacing: 16) {
            HStack {
                Text("YATA").font(.headline)
                Picker("Channel", selection: $selected) {
                    ForEach(TVChannel.all) { channel in
                        Text("\(channel.number) · \(channel.name)").tag(channel.id)
                    }
                }.onChange(of: selected) { _, _ in tune() }
            }
            if playlist.isEmpty {
                ContentUnavailableView("Waiting for a playable channel", systemImage: "tv", description: Text(catalog.status))
            } else {
                VideoPlayer(player: player)
                Text(playlist[index].title).font(.caption)
                HStack {
                    Button("Previous channel") { changeChannel(-1) }
                    Button("Next program") { advance() }
                    Button("Next channel") { changeChannel(1) }
                }
                if playbackError {
                    Text("This stream could not play. Try the next program.").foregroundStyle(.orange)
                }
            }
        }
        .padding(32)
        .onChange(of: catalog.shows.map(\.id)) { _, _ in startIfReady() }
        .onAppear { startIfReady(); if active { player.play() } }
        .onChange(of: active) { _, value in
            if value { startIfReady(); player.play() } else { player.pause() }
        }
        .onDisappear { player.pause() }
        .onReceive(NotificationCenter.default.publisher(for: .AVPlayerItemDidPlayToEndTime)) { notice in
            guard active, let item = notice.object as? AVPlayerItem, item === player.currentItem else { return }
            advance()
        }
        .onReceive(NotificationCenter.default.publisher(for: .AVPlayerItemFailedToPlayToEndTime)) { notice in
            guard let item = notice.object as? AVPlayerItem, item === player.currentItem else { return }
            playbackError = true
        }
    }

    private func startIfReady() {
        guard !started, !catalog.shows.isEmpty else { return }
        selected = TVChannel.startup(last: lastChannel, shows: catalog.shows)
        started = true
        tune()
    }

    private func tune() {
        playlist = TVChannel.playlist(selected, shows: catalog.shows)
        index = 0
        guard !playlist.isEmpty else { player.replaceCurrentItem(with: nil); return }
        lastChannel = selected
        playCurrent()
    }

    private func playCurrent() {
        guard playlist.indices.contains(index), let url = playlist[index].playableURL else { return }
        playbackError = false
        try? AVAudioSession.sharedInstance().setCategory(.playback, mode: .moviePlayback)
        try? AVAudioSession.sharedInstance().setActive(true)
        player.replaceCurrentItem(with: AVPlayerItem(url: url))
        if active { player.play() }
    }

    private func advance() {
        guard !playlist.isEmpty else { return }
        index = (index + 1) % playlist.count
        playCurrent()
    }

    private func changeChannel(_ delta: Int) {
        let available = TVChannel.all.filter { !TVChannel.playlist($0.id, shows: catalog.shows).isEmpty }
        guard !available.isEmpty else { return }
        let current = available.firstIndex { $0.id == selected } ?? 0
        selected = available[(current + delta + available.count) % available.count].id
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
