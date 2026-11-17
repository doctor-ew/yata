import UIKit
import Capacitor

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = YataViewController()
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}


class YataViewController: CAPBridgeViewController {
    override func capacitorDidLoad() { bridge?.registerPluginInstance(YataCatalogPlugin()) }
}

@objc(YataCatalogPlugin)
class YataCatalogPlugin: CAPPlugin, CAPBridgedPlugin {
    let identifier = "YataCatalogPlugin"
    let jsName = "YataCatalog"
    let pluginMethods: [CAPPluginMethod] = [CAPPluginMethod(name: "read", returnType: CAPPluginReturnPromise)]
    @objc func read(_ call: CAPPluginCall) {
        let path = call.getString("path") ?? ""
        let caption = call.getString("captionUrl") ?? ""
        var target = "https://doctorew.com" + path
        var limit = 8_000_000
        if !caption.isEmpty {
            guard let value = URL(string: caption), value.scheme == "https", value.host == "archive.org",
                  value.user == nil, value.port == nil || value.port == 443,
                  value.path.range(of: #"^/download/[^/]+/.+\.(vtt|srt)$"#, options: .regularExpression) != nil else {
                call.reject("Unsupported caption URL."); return
            }
            target = caption; limit = 1_000_000
        } else if path != "/tv/data/published-catalog-manifest.json" &&
                    path != "/tv/data/library-art.json" && path != "/tv/data/arcade-games.json" &&
                    path.range(of: #"^/tv/data/catalogs/[a-f0-9]{64}\.json$"#, options: .regularExpression) == nil {
            call.reject("Unsupported catalog path."); return
        }
        guard let url = URL(string: target) else { call.reject("Invalid URL."); return }
        var request = URLRequest(url: url); request.timeoutInterval = 20
        URLSession.shared.dataTask(with: request) { data, response, error in
            guard error == nil, let response = response as? HTTPURLResponse,
                  response.statusCode == 200, response.url?.host == url.host,
                  let data = data, data.count <= limit,
                  let text = String(data: data, encoding: .utf8) else {
                call.reject("Catalog refresh unavailable."); return
            }
            call.resolve(["text": text])
        }.resume()
    }
}
