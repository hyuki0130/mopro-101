import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    print("🔵 AppDelegate: didFinishLaunchingWithOptions started")

    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    window = UIWindow(frame: UIScreen.main.bounds)
    print("🔵 AppDelegate: Window created with frame: \(UIScreen.main.bounds)")

    factory.startReactNative(
      withModuleName: "ProofPortApp",
      in: window,
      launchOptions: launchOptions
    )

    print("🔵 AppDelegate: React Native started with module: ProofPortApp")
    print("🔵 AppDelegate: Window visible: \(window?.isHidden == false)")

    return true
  }

  // Deep link handling - URL Scheme
  func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
    print("🔵 AppDelegate: Deep link received - \(url.absoluteString)")
    return RCTLinkingManager.application(app, open: url, options: options)
  }

  // Universal Links handling
  func application(
    _ application: UIApplication,
    continue userActivity: NSUserActivity,
    restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
  ) -> Bool {
    print("🔵 AppDelegate: Universal link received")
    return RCTLinkingManager.application(application, continue: userActivity, restorationHandler: restorationHandler)
  }
}

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    print("🔵 ReactNativeDelegate: sourceURL called")
    let url = self.bundleURL()
    print("🔵 ReactNativeDelegate: sourceURL = \(url?.absoluteString ?? "nil")")
    return url
  }

  override func bundleURL() -> URL? {
    print("🔵 ReactNativeDelegate: bundleURL called")
#if DEBUG
    let url = RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
    print("🔵 ReactNativeDelegate: DEBUG bundle URL = \(url?.absoluteString ?? "nil")")
    return url
#else
    let url = Bundle.main.url(forResource: "main", withExtension: "jsbundle")
    print("🔵 ReactNativeDelegate: RELEASE bundle URL = \(url?.absoluteString ?? "nil")")
    return url
#endif
  }
}
