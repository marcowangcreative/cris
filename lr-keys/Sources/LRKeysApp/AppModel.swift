#if os(macOS)
import AppKit
import Combine

final class AppModel: ObservableObject {
    @Published var keymap: Keymap
    @Published var report: CompatReport?
    @Published var statusText: String
    @Published var connected = false
    @Published var accessibilityTrusted = false
    @Published var lightroomFrontmost = false
    @Published var recordingID: UUID?
    @Published var compatNote = ""

    let supportDirectory: URL
    var onKeymapChange: ((Keymap) -> Void)?
    var onProbe: (() -> Void)?
    private var keyMonitor: Any?

    init(keymap: Keymap, supportDirectory: URL) {
        self.keymap = keymap
        self.supportDirectory = supportDirectory
        self.statusText = "Starting"
    }

    var unsupported: Set<String> {
        report?.disabledParameters(in: DevelopCatalog.parameters) ?? []
    }

    func isUnsupported(_ binding: KeyBinding) -> Bool {
        unsupported.contains(binding.parameter)
    }

    func replaceKeymap(_ keymap: Keymap, persist: Bool) {
        self.keymap = keymap.normalized()
        if persist {
            try? KeymapStore.save(self.keymap, directory: supportDirectory)
        }
        onKeymapChange?(self.keymap)
    }

    func setStep(parameter: String, base: Double) {
        guard base > 0, var step = keymap.steps[parameter] else { return }
        step.base = base
        keymap.steps[parameter] = step
        replaceKeymap(keymap, persist: true)
    }

    func setMultiplier(option: Double? = nil, shift: Double? = nil) {
        if let option, option > 0 {
            keymap.multipliers.option = option
        }
        if let shift, shift > 0 {
            keymap.multipliers.shift = shift
        }
        replaceKeymap(keymap, persist: true)
    }

    func deleteBinding(_ id: UUID) {
        keymap.bindings.removeAll { $0.id == id }
        replaceKeymap(keymap, persist: true)
    }

    func beginRecording(_ id: UUID) {
        recordingID = id
        guard keyMonitor == nil else { return }
        keyMonitor = NSEvent.addLocalMonitorForEvents(matching: .keyDown) { [weak self] event in
            guard let self, let recordingID = self.recordingID else { return event }
            if event.keyCode == 53 {
                self.recordingID = nil
                return nil
            }
            if event.modifierFlags.contains(.command) || event.modifierFlags.contains(.control) {
                return event
            }
            let code = Int(event.keyCode)
            let label = MacKeyCodes.label(for: code) ?? "key#\(code)"
            guard let index = self.keymap.bindings.firstIndex(where: { $0.id == recordingID }) else {
                self.recordingID = nil
                return nil
            }
            self.keymap.bindings[index].key = label
            self.keymap.bindings[index].keyCode = code
            self.recordingID = nil
            self.replaceKeymap(self.keymap, persist: true)
            return nil
        }
    }

    func importFile(at url: URL) {
        do {
            let result = try PowerKeysImporter.importMap(Data(contentsOf: url))
            replaceKeymap(result.keymap, persist: true)
            statusText = result.warnings.isEmpty
                ? "Imported \(result.keymap.name)"
                : "Imported \(result.keymap.name) with \(result.warnings.count) warning(s)"
        } catch {
            statusText = "Import failed"
        }
    }

    func resetDefault() {
        if let map = try? Keymap.loadDefault() {
            replaceKeymap(map, persist: true)
        }
    }

    func requestProbe() {
        onProbe?()
    }
}
#endif
