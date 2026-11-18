import Foundation
import CryptoKit

@main
struct CatalogTests {
    static func main() throws {
        let root = URL(fileURLWithPath: CommandLine.arguments[1])
        let manifest = try JSONDecoder().decode(CatalogManifest.self, from: Data(contentsOf: root.appendingPathComponent("manifest.json")))
        let data = try Data(contentsOf: root.appendingPathComponent("catalog.json"))
        let catalog = try CatalogReader.decode(data, manifest: manifest)
        precondition(!catalog.shows.isEmpty)
        precondition(catalog.shows.flatMap(\.episodes).contains { $0.playableURL != nil })
        do {
            _ = try CatalogReader.decode(data + Data([32]), manifest: manifest)
            fatalError("Tampered snapshot accepted")
        } catch CatalogError.invalid {}
        do {
            _ = try CatalogReader.decode(data, manifest: CatalogManifest(revision: manifest.revision, catalog: "https://evil.example/catalog.json"))
            fatalError("Foreign manifest path accepted")
        } catch CatalogError.invalid {}
        for url in ["http://archive.org/download/test/file.mp4", "https://evil.example/download/test/file.mp4", "https://archive.org.evil.example/download/test/file.mp4", "https://user@archive.org/download/test/file.mp4", "https://archive.org:444/download/test/file.mp4", "https://archive.org/details/test", "https://archive.org/download/test/file.html"] {
            precondition(Source(provider: "archive", url: url, availability: "verified").playableURL == nil, "Unsafe source accepted")
        }
        let valid = "https://archive.org/download/test/file.mp4"
        precondition(Source(provider: "archive", url: valid, availability: "verified").playableURL != nil)
        precondition(Source(provider: "archive", url: valid, availability: "unavailable").playableURL == nil)
        precondition(Source(provider: "youtube", url: valid, availability: "verified").playableURL == nil)
        print("PASS: published snapshot decoding, tamper rejection, manifest path, provider and playback URL boundaries")
    }
}
