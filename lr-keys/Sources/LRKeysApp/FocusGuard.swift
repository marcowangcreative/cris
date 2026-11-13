#if os(macOS)
import AppKit

enum FrontApp {
    static func isLightroom(_ application: NSRunningApplication?) -> Bool {
        guard let identifier = application?.bundleIdentifier?.lowercased() else {
            return false
        }
        return identifier == "com.adobe.lightroomclassiccc" || identifier.contains("lightroomclassic")
    }
}

enum FocusGuard {
    /// True when Accessibility says the focused control is a text editor.
    /// Adobe's accessibility tree is incomplete, so a field Lightroom does not
    /// expose still receives the shortcut. That needs a check on a real Mac.
    static func isTextInput() -> Bool {
        let system = AXUIElementCreateSystemWide()
        var focused: CFTypeRef?
        guard AXUIElementCopyAttributeValue(system, kAXFocusedUIElementAttribute as CFString, &focused) == .success,
              let focused
        else {
            return false
        }
        let element = focused as! AXUIElement
        var roleValue: CFTypeRef?
        guard AXUIElementCopyAttributeValue(element, kAXRoleAttribute as CFString, &roleValue) == .success,
              let role = roleValue as? String
        else {
            return false
        }
        let textRoles: Set<String> = [
            "AXTextField", "AXTextArea", "AXComboBox", "AXSearchField", "AXSecureTextField",
        ]
        if textRoles.contains(role) {
            return true
        }
        let lowered = role.lowercased()
        return lowered.contains("text") || lowered.contains("search")
    }
}
#endif
