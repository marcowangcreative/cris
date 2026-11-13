#if os(macOS)
import AppKit

private func eventTapCallback(
    _ proxy: CGEventTapProxy,
    _ type: CGEventType,
    _ event: CGEvent,
    _ userInfo: UnsafeMutableRawPointer?
) -> Unmanaged<CGEvent>? {
    guard let userInfo else {
        return Unmanaged.passUnretained(event)
    }
    let tap = Unmanaged<EventTap>.fromOpaque(userInfo).takeUnretainedValue()
    return tap.handle(proxy: proxy, type: type, event: event)
}

/// Session event tap. Installed only while Lightroom Classic is frontmost.
final class EventTap {
    private var port: CFMachPort?
    private var source: CFRunLoopSource?
    private var swallowed = Set<Int>()
    private let context: () -> (Keymap, Set<String>)
    var onDecision: (KeyDecision) -> Void

    init(context: @escaping () -> (Keymap, Set<String>), onDecision: @escaping (KeyDecision) -> Void) {
        self.context = context
        self.onDecision = onDecision
    }

    var isRunning: Bool { port != nil }

    func start() -> Bool {
        if port != nil {
            return true
        }
        let mask: CGEventMask =
            (1 << CGEventType.keyDown.rawValue) |
            (1 << CGEventType.keyUp.rawValue)
        guard let created = CGEvent.tapCreate(
            tap: .cgSessionEventTap,
            place: .headInsertEventTap,
            options: .defaultTap,
            eventsOfInterest: mask,
            callback: eventTapCallback,
            userInfo: Unmanaged.passUnretained(self).toOpaque()
        ) else {
            return false
        }
        port = created
        let runLoopSource = CFMachPortCreateRunLoopSource(kCFAllocatorDefault, created, 0)
        source = runLoopSource
        CFRunLoopAddSource(CFRunLoopGetMain(), runLoopSource, .commonModes)
        CGEvent.tapEnable(tap: created, enable: true)
        return true
    }

    func stop() {
        swallowed.removeAll()
        if let port {
            CGEvent.tapEnable(tap: port, enable: false)
            CFMachPortInvalidate(port)
        }
        if let source {
            CFRunLoopRemoveSource(CFRunLoopGetMain(), source, .commonModes)
        }
        port = nil
        source = nil
    }

    func handle(proxy: CGEventTapProxy, type: CGEventType, event: CGEvent) -> Unmanaged<CGEvent>? {
        if type == .tapDisabledByTimeout || type == .tapDisabledByUserInput {
            if let port {
                CGEvent.tapEnable(tap: port, enable: true)
            }
            return nil
        }
        let code = Int(event.getIntegerValueField(.keyboardEventKeycode))
        if type == .keyUp {
            if swallowed.remove(code) != nil {
                return nil
            }
            return Unmanaged.passUnretained(event)
        }
        guard type == .keyDown else {
            return Unmanaged.passUnretained(event)
        }
        let flags = event.flags
        if flags.contains(.maskCommand) || flags.contains(.maskControl) {
            return Unmanaged.passUnretained(event)
        }
        let pair = context()
        let mapped = pair.0.bindings.contains { binding in
            if let stored = binding.keyCode {
                return stored == code
            }
            if let label = MacKeyCodes.normalize(binding.key), let keyCode = MacKeyCodes.code(for: label) {
                return keyCode == code
            }
            return false
        }
        if !mapped {
            return Unmanaged.passUnretained(event)
        }
        let decision = pair.0.decide(
            keyCode: code,
            option: flags.contains(.maskAlternate),
            shift: flags.contains(.maskShift),
            command: false,
            control: false,
            textField: FocusGuard.isTextInput(),
            unsupported: pair.1
        )
        switch decision {
        case .pass:
            return Unmanaged.passUnretained(event)
        case .conflict, .unsupported, .fire:
            swallowed.insert(code)
            onDecision(decision)
            return nil
        }
    }
}
#endif
