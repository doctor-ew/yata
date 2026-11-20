import Foundation
import CryptoKit
import Combine

struct Catalog: Decodable {
    let version: Int
    let shows: [Show]
}

struct Show: Decodable, Identifiable {
    let id: String
    let title: String
    let channel: String
    let episodes: [Episode]
}

struct Episode: Decodable, Identifiable {
    let id: String
    let title: String
    let sources: [Source]
    var kind: String? = nil

    var playableURL: URL? { sources.compactMap(\.playableURL).first }
}

struct Source: Decodable {
    let provider: String
    let url: String
    let availability: String

    var playableURL: URL? {
        guard provider == "archive", availability == "verified",
              let value = URL(string: url), value.scheme == "https",
              value.host == "archive.org", value.user == nil, value.password == nil,
              value.port == nil || value.port == 443,
              value.path.hasPrefix("/download/"),
              ["mp4", "m4v", "mov", "m3u8"].contains(value.pathExtension.lowercased()) else { return nil }
        return value
    }
}

struct CatalogManifest: Decodable {
    let revision: String
    let catalog: String

    var valid: Bool {
        revision.count == 64 && revision.allSatisfy { "0123456789abcdef".contains($0) }
            && catalog == "data/catalogs/\(revision).json"
    }
}

enum CatalogError: LocalizedError {
    case invalid
    var errorDescription: String? { "The catalog could not be verified. Please try again." }
}

enum CatalogReader {
    static let base = URL(string: "https://doctorew.com/tv/")!

    static func decode(_ data: Data, manifest: CatalogManifest) throws -> Catalog {
        guard manifest.valid, data.count <= 8_000_000,
              SHA256.hash(data: data).map({ String(format: "%02x", $0) }).joined() == manifest.revision else {
            throw CatalogError.invalid
        }
        let catalog = try JSONDecoder().decode(Catalog.self, from: data)
        guard catalog.version == 1, !catalog.shows.isEmpty, catalog.shows.count <= 512,
              Set(catalog.shows.map(\.id)).count == catalog.shows.count else { throw CatalogError.invalid }
        return catalog
    }

    static func read(_ url: URL, limit: Int) async throws -> Data {
        var request = URLRequest(url: url)
        request.timeoutInterval = 20
        let (bytes, response) = try await URLSession.shared.bytes(for: request)
        guard let http = response as? HTTPURLResponse, http.statusCode == 200,
              http.url?.scheme == "https", http.url?.host == url.host,
              response.expectedContentLength <= limit else { throw CatalogError.invalid }
        var data = Data()
        for try await byte in bytes {
            guard data.count < limit else { throw CatalogError.invalid }
            data.append(byte)
        }
        return data
    }

    static func remote() async throws -> Catalog {
        let data = try await read(base.appendingPathComponent("data/published-catalog-v2-manifest.json"), limit: 64_000)
        let manifest = try JSONDecoder().decode(CatalogManifest.self, from: data)
        guard manifest.valid else { throw CatalogError.invalid }
        return try decode(await read(base.appendingPathComponent(manifest.catalog), limit: 8_000_000), manifest: manifest)
    }

    static func bundled() throws -> Catalog {
        guard let root = Bundle.main.resourceURL?.appendingPathComponent("Catalog"),
              let manifestData = try? Data(contentsOf: root.appendingPathComponent("manifest.json")) else {
            throw CatalogError.invalid
        }
        let manifest = try JSONDecoder().decode(CatalogManifest.self, from: manifestData)
        return try decode(Data(contentsOf: root.appendingPathComponent("catalog.json")), manifest: manifest)
    }
}

@MainActor
final class CatalogStore: ObservableObject {
    @Published var shows: [Show] = []
    @Published var status = "Loading your television library…"

    func load() async {
        if shows.isEmpty, let catalog = try? CatalogReader.bundled() {
            shows = catalog.shows
            status = "Bundled catalog"
        }
        do {
            shows = try await CatalogReader.remote().shows
            status = "Catalog up to date"
        } catch {
            status = shows.isEmpty ? error.localizedDescription : "Using bundled catalog. Refresh unavailable."
        }
    }
}

// Native channel rotation uses verified playable episodes, one show per turn.
// Shared wall-clock scheduling and the Channel 00 queue remain separate work.
struct TVChannel: Identifiable {
    let id: String
    let number: String
    let name: String

    static let all = [
        TVChannel(id: "mixed", number: "01", name: "YATA Channels"),
        TVChannel(id: "action", number: "02", name: "Action Adventure"),
        TVChannel(id: "cartoons", number: "04", name: "Saturday Morning"),
        TVChannel(id: "comedy", number: "05", name: "Comedy"),
        TVChannel(id: "seventies", number: "06", name: "70s Prime Time"),
        TVChannel(id: "late-night", number: "07", name: "Late Night Toons"),
        TVChannel(id: "nick", number: "08", name: "Nickelodeon"),
        TVChannel(id: "drama", number: "09", name: "Drama"),
        TVChannel(id: "scifi", number: "10", name: "Sci-Fi")
    ]

    static func startup(last: String, shows: [Show]) -> String {
        all.contains(where: { $0.id == last }) && !playlist(last, shows: shows).isEmpty ? last : "mixed"
    }

    static func playlist(_ channel: String, shows: [Show]) -> [Episode] {
        guard all.contains(where: { $0.id == channel }) else { return [] }
        let queues = shows.filter {
            (channel == "mixed" || $0.channel == channel) && $0.id != "vintage-commercials"
        }.map { $0.episodes.filter { $0.kind == "episode" && $0.playableURL != nil } }
        var result: [Episode] = []
        for index in 0..<(queues.map(\.count).max() ?? 0) {
            for queue in queues where index < queue.count { result.append(queue[index]) }
        }
        return result
    }
}
