import Foundation

/// US-ANSI virtual key codes (Carbon `kVK_ANSI_*`). Bindings name the physical
/// key by its US label. The event tap matches `keyCode`, so a non-US layout
/// still fires the key in that position.
public enum MacKeyCodes {
    public static let codeByLabel: [String: Int] = {
        var map: [String: Int] = [:]
        let letters: [(String, Int)] = [
            ("a", 0x00), ("s", 0x01), ("d", 0x02), ("f", 0x03), ("h", 0x04),
            ("g", 0x05), ("z", 0x06), ("x", 0x07), ("c", 0x08), ("v", 0x09),
            ("b", 0x0B), ("q", 0x0C), ("w", 0x0D), ("e", 0x0E), ("r", 0x0F),
            ("y", 0x10), ("t", 0x11), ("o", 0x1F), ("u", 0x20), ("i", 0x22),
            ("p", 0x23), ("l", 0x25), ("j", 0x26), ("k", 0x28), ("n", 0x2D),
            ("m", 0x2E),
        ]
        for (label, code) in letters {
            map[label] = code
        }
        let digits: [(String, Int)] = [
            ("1", 0x12), ("2", 0x13), ("3", 0x14), ("4", 0x15), ("5", 0x16),
            ("6", 0x17), ("7", 0x1A), ("8", 0x1C), ("9", 0x19), ("0", 0x1D),
        ]
        for (label, code) in digits {
            map[label] = code
        }
        let punctuation: [(String, Int)] = [
            ("=", 0x18), ("-", 0x1B), ("]", 0x1E), ("[", 0x21), ("'", 0x27),
            (";", 0x29), ("\\", 0x2A), (",", 0x2B), ("/", 0x2C), (".", 0x2F),
            ("`", 0x32), ("space", 0x31),
        ]
        for (label, code) in punctuation {
            map[label] = code
        }
        let functions: [(String, Int)] = [
            ("f1", 0x7A), ("f2", 0x78), ("f3", 0x63), ("f4", 0x76),
            ("f5", 0x60), ("f6", 0x61), ("f7", 0x62), ("f8", 0x64),
            ("f9", 0x65), ("f10", 0x6D), ("f11", 0x67), ("f12", 0x6F),
            ("left", 0x7B), ("right", 0x7C), ("down", 0x7D), ("up", 0x7E),
            ("escape", 0x35), ("return", 0x24), ("tab", 0x30), ("delete", 0x33),
        ]
        for (label, code) in functions {
            map[label] = code
        }
        return map
    }()

    public static let labelByCode: [Int: String] = {
        var map: [Int: String] = [:]
        for (label, code) in codeByLabel where map[code] == nil {
            map[code] = label
        }
        return map
    }()

    private static let names: [String: String] = [
        "minus": "-", "hyphen": "-", "dash": "-",
        "equal": "=", "equals": "=", "plus": "=",
        "comma": ",", "period": ".", "dot": ".",
        "slash": "/", "backslash": "\\",
        "semicolon": ";", "semi": ";",
        "quote": "'", "apostrophe": "'",
        "leftbracket": "[", "rightbracket": "]",
        "openbracket": "[", "closebracket": "]",
        "grave": "`", "backtick": "`",
        "space": "space", "spacebar": "space",
        "esc": "escape", "escape": "escape",
        "return": "return", "enter": "return",
        "tab": "tab", "delete": "delete", "backspace": "delete",
        "left": "left", "rightarrow": "right", "right": "right",
        "leftarrow": "left", "up": "up", "down": "down",
        "uparrow": "up", "downarrow": "down",
    ]

    public static func code(for label: String) -> Int? {
        codeByLabel[label]
    }

    public static func label(for keyCode: Int) -> String? {
        labelByCode[keyCode]
    }

    /// Returns a stable label, or nil when the text is not a key we understand.
    public static func normalize(_ raw: String) -> String? {
        let trimmed = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmed.isEmpty {
            return nil
        }
        let lower = trimmed.lowercased()
        if lower.hasPrefix("key#") {
            let digits = lower.dropFirst(4)
            if let code = Int(digits), label(for: code) != nil || (code >= 0 && code < 512) {
                return label(for: code) ?? "key#\(code)"
            }
            return nil
        }
        if trimmed.count == 1 {
            return lower
        }
        let folded = lower.unicodeScalars.filter { CharacterSet.alphanumerics.contains($0) }
        let compact = String(String.UnicodeScalarView(folded))
        if let named = names[compact] {
            return named
        }
        if codeByLabel[compact] != nil {
            return compact
        }
        if compact.hasPrefix("key") && compact.count == 4 {
            let letter = String(compact.suffix(1))
            if codeByLabel[letter] != nil {
                return letter
            }
        }
        return nil
    }
}
