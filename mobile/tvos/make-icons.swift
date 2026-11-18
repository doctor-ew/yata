// Reproducible typographic YATA icons; no third-party artwork.
import AppKit
import Foundation

let root = URL(fileURLWithPath: CommandLine.arguments[1])
let fm = FileManager.default
func json(_ value: Any, _ dir: URL) throws {
    try fm.createDirectory(at: dir, withIntermediateDirectories: true)
    try JSONSerialization.data(withJSONObject: value, options: [.prettyPrinted, .sortedKeys]).write(to: dir.appendingPathComponent("Contents.json"))
}
let info: [String: Any] = ["author": "xcode", "version": 1]
func draw(_ width: Int, _ height: Int, _ file: URL, foreground: Bool, background: Bool) throws {
    let bitmap = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: width, pixelsHigh: height,
        bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false,
        colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: bitmap)
    if background {
        NSColor(calibratedRed: 0.13, green: 0.10, blue: 0.08, alpha: 1).setFill()
        NSBezierPath(rect: NSRect(x: 0, y: 0, width: width, height: height)).fill()
    }
    if foreground {
        let attributes: [NSAttributedString.Key: Any] = [
            .font: NSFont.systemFont(ofSize: CGFloat(height) * 0.37, weight: .black),
            .foregroundColor: NSColor(calibratedRed: 0.84, green: 0.60, blue: 0.39, alpha: 1)
        ]
        let title = NSAttributedString(string: "YATA", attributes: attributes)
        let size = title.size()
        title.draw(at: NSPoint(x: (CGFloat(width) - size.width) / 2, y: (CGFloat(height) - size.height) / 2))
    }
    NSGraphicsContext.restoreGraphicsState()
    try bitmap.representation(using: .png, properties: [:])!.write(to: file)
}
try json(["info": info], root)
let brand = root.appendingPathComponent("App Icon.brandassets")
var assets: [[String: Any]] = []
for (name, w, h, store) in [("App Icon", 400, 240, false), ("App Store", 1280, 768, true)] {
    let stack = brand.appendingPathComponent("\(name).imagestack")
    try json(["info": info, "layers": [["filename": "Front.imagestacklayer"], ["filename": "Back.imagestacklayer"]]], stack)
    for layer in ["Front", "Back"] {
        let dir = stack.appendingPathComponent("\(layer).imagestacklayer")
        try json(["info": info], dir)
        let images = dir.appendingPathComponent("Content.imageset")
        try fm.createDirectory(at: images, withIntermediateDirectories: true)
        var entries: [[String: Any]] = []
        for scale in (store ? [1] : [1, 2]) {
            let file = "icon-\(scale)x.png"
            try draw(w * scale, h * scale, images.appendingPathComponent(file), foreground: layer == "Front", background: layer == "Back")
            entries.append(["filename": file, "idiom": "tv", "scale": "\(scale)x"])
        }
        try json(["info": info, "images": entries], images)
    }
    assets.append(["filename": "\(name).imagestack", "idiom": "tv", "role": "primary-app-icon", "size": "\(w)x\(h)"])
}
for (name, w, role) in [("Top Shelf", 1920, "top-shelf-image"), ("Top Shelf Wide", 2320, "top-shelf-image-wide")] {
    let images = brand.appendingPathComponent("\(name).imageset")
    try fm.createDirectory(at: images, withIntermediateDirectories: true)
    var entries: [[String: Any]] = []
    for scale in [1, 2] {
        let file = "shelf-\(scale)x.png"
        try draw(w * scale, 720 * scale, images.appendingPathComponent(file), foreground: true, background: true)
        entries.append(["filename": file, "idiom": "tv", "scale": "\(scale)x"])
    }
    try json(["info": info, "images": entries], images)
    assets.append(["filename": "\(name).imageset", "idiom": "tv", "role": role, "size": "\(w)x720"])
}
try json(["info": info, "assets": assets], brand)
