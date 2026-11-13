#if os(macOS)
import AppKit
import SwiftUI

final class AppDelegate: NSObject, NSApplicationDelegate {
    private let model: AppModel
    private let hud = HUDPanel()
    private let link: LightroomLink
    private let tap: EventTap
    private var statusItem: NSStatusItem?
    private var editorWindow: NSWindow?
    private var compatWindow: NSWindow?
    private var compatWaiting = false
    private var observers: [Any] = []

    override init() {
        let directory = FileManager.default
            .urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("LR Keys", isDirectory: true)
        let keymap = (try? KeymapStore.load(directory: directory)) ?? (try? Keymap.loadDefault()) ?? Keymap(
            version: 1,
            name: "LR Keys",
            port: Keymap.defaultPort,
            multipliers: .powerKeys,
            steps: [:],
            bindings: []
        )
        try? KeymapStore.save(keymap, directory: directory)
        let model = AppModel(keymap: keymap, supportDirectory: directory)
        if let existing = try? CompatReport.load(from: directory.appendingPathComponent("compat.json")) {
            model.report = existing
        }
        self.model = model
        self.link = LightroomLink(port: keymap.port)
        self.tap = EventTap(
            context: { (model.keymap, model.unsupported) },
            onDecision: { _ in }
        )
        super.init()
        tap.onDecision = { [weak self] decision in
            self?.handle(decision)
        }
        link.onStatus = { [weak self] text, connected in
            self?.model.statusText = text
            self?.model.connected = connected
            self?.updateMenu()
        }
        link.onReadout = { [weak self] text in
            self?.hud.show(text)
        }
        link.onReport = { [weak self] report in
            self?.model.report = report
            self?.compatWaiting = false
            self?.updateMenu()
        }
        model.onKeymapChange = { [weak self] keymap in
            self?.link.updatePort(keymap.port)
        }
        model.onProbe = { [weak self] in
            self?.runCompatCheck()
        }
    }

    private func handle(_ decision: KeyDecision) {
        switch decision {
        case let .fire(_, command, readout):
            hud.show(readout)
            link.send(command)
        case let .conflict(key):
            hud.show("Conflict on \(key)")
        case let .unsupported(name):
            hud.show("\(name) unsupported")
        case .pass:
            break
        }
    }

    func applicationDidFinishLaunching(_ notification: Notification) {
        installStatusItem()
        promptForAccessibility()
        let center = NSWorkspace.shared.notificationCenter
        observers.append(center.addObserver(forName: NSWorkspace.didActivateApplicationNotification, object: nil, queue: .main) { [weak self] _ in
            self?.refreshTap()
        })
        observers.append(center.addObserver(forName: NSWorkspace.didDeactivateApplicationNotification, object: nil, queue: .main) { [weak self] _ in
            self?.refreshTap()
        })
        Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] _ in
            self?.refreshTap()
        }
        link.start()
        refreshTap()
    }

    func applicationWillTerminate(_ notification: Notification) {
        link.stop()
        tap.stop()
    }

    private func installStatusItem() {
        let item = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
        item.button?.title = "LR Keys"
        statusItem = item
        updateMenu()
    }

    private func updateMenu() {
        let menu = NSMenu()
        let status = NSMenuItem(title: model.statusText, action: nil, keyEquivalent: "")
        status.isEnabled = false
        menu.addItem(status)
        let front = model.lightroomFrontmost ? "Lightroom is frontmost" : "Waiting for Lightroom to be frontmost"
        let access = model.accessibilityTrusted ? "Accessibility granted" : "Accessibility not granted"
        for title in [front, access] {
            let item = NSMenuItem(title: title, action: nil, keyEquivalent: "")
            item.isEnabled = false
            menu.addItem(item)
        }
        if let report = model.report, report.failCount > 0 {
            let item = NSMenuItem(title: "\(report.failCount) unsupported", action: nil, keyEquivalent: "")
            item.isEnabled = false
            menu.addItem(item)
        }
        menu.addItem(.separator())
        menu.addItem(item("Compat Check", action: #selector(runCompatCheck)))
        menu.addItem(item("Shortcut Editor…", action: #selector(showEditor)))
        menu.addItem(item("Reload Keymap", action: #selector(reloadKeymap)))
        menu.addItem(.separator())
        let quit = NSMenuItem(title: "Quit LR Keys", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q")
        quit.target = NSApp
        menu.addItem(quit)
        statusItem?.menu = menu
    }

    private func item(_ title: String, action: Selector) -> NSMenuItem {
        let item = NSMenuItem(title: title, action: action, keyEquivalent: "")
        item.target = self
        return item
    }

    private func promptForAccessibility() {
        let key = kAXTrustedCheckOptionPrompt.takeUnretainedValue() as String
        _ = AXIsProcessTrustedWithOptions([key: true] as CFDictionary)
    }

    private func refreshTap() {
        let trusted = AXIsProcessTrusted()
        let front = FrontApp.isLightroom(NSWorkspace.shared.frontmostApplication)
        let changed = trusted != model.accessibilityTrusted || front != model.lightroomFrontmost
        model.accessibilityTrusted = trusted
        model.lightroomFrontmost = front
        if trusted && front {
            if !tap.isRunning && !tap.start() {
                model.statusText = "Could not install the keyboard tap"
            }
        } else {
            tap.stop()
        }
        if changed {
            updateMenu()
        }
    }

    @objc private func showEditor() {
        if editorWindow == nil {
            let host = NSHostingController(rootView: ShortcutEditorView(model: model))
            let window = NSWindow(contentViewController: host)
            window.title = "LR Keys Shortcuts"
            window.styleMask = [.titled, .closable, .miniaturizable, .resizable]
            window.setContentSize(NSSize(width: 720, height: 640))
            editorWindow = window
        }
        editorWindow?.center()
        activate()
        editorWindow?.makeKeyAndOrderFront(nil)
    }

    @objc private func runCompatCheck() {
        compatWaiting = true
        model.compatNote = "Checking…"
        showCompat()
        link.probe()
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) { [weak self] in
            guard let self, self.compatWaiting else { return }
            let url = self.model.supportDirectory.appendingPathComponent("compat.json")
            if let report = try? CompatReport.load(from: url) {
                self.model.report = report
                self.model.compatNote = ""
            } else {
                self.model.compatNote = "No reply from the plugin. Enable LR Keys in Plug-in Manager, then open Develop and try again."
            }
            self.compatWaiting = false
        }
    }

    private func showCompat() {
        if compatWindow == nil {
            let host = NSHostingController(rootView: CompatListView(model: model))
            let window = NSWindow(contentViewController: host)
            window.title = "LR Keys Compat Check"
            window.styleMask = [.titled, .closable, .miniaturizable, .resizable]
            window.setContentSize(NSSize(width: 720, height: 480))
            compatWindow = window
        }
        compatWindow?.center()
        activate()
        compatWindow?.makeKeyAndOrderFront(nil)
    }

    @objc private func reloadKeymap() {
        if let keymap = try? KeymapStore.load(directory: model.supportDirectory) {
            model.replaceKeymap(keymap, persist: false)
        }
    }

    private func activate() {
        if #available(macOS 14.0, *) {
            NSApp.activate()
        } else {
            NSApp.activate(ignoringOtherApps: true)
        }
    }
}

#endif
