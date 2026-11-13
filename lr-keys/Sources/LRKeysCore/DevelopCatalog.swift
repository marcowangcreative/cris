import Foundation

public enum ActionKind: String, Codable, Equatable {
    case adjust
    case toggle
    case run
}

public enum Direction: String, Codable, Equatable {
    case increase
    case decrease
}

/// One develop target loaded from `develop-parameters.json`.
/// Slider limits are not stored here. The plugin reads them with
/// `LrDevelopController.getRange` for the photo that is open.
public struct DevelopParameter: Codable, Equatable {
    public var canonical: String
    public var displayName: String
    public var defaultStep: Double
    public var kind: ActionKind
    public var sdkName: String
    public var maskSDKName: String?
    /// `value` probes getValue/getRange. `function` only checks that the SDK function exists.
    public var probe: String
    public var aliases: [String]
    public var note: String?
}

public struct CatalogFunction: Codable, Equatable {
    public var name: String
    public var since: String
}

public struct CatalogDocument: Codable, Equatable {
    public var sdkVersion: String
    public var sdkMinimumVersion: String
    /// Documentation only. Classic 16's Temperature change is recorded here
    /// and is not used as a clamp.
    public var temperatureNote: String
    public var parameters: [DevelopParameter]
    public var functions: [CatalogFunction]
}

public enum DevelopCatalog {
    public static let document: CatalogDocument = load()

    public static var parameters: [DevelopParameter] { document.parameters }
    public static var functions: [CatalogFunction] { document.functions }
    public static var sdkVersion: String { document.sdkVersion }
    public static var sdkMinimumVersion: String { document.sdkMinimumVersion }
    public static var temperatureNote: String { document.temperatureNote }

    public static func parameter(_ name: String) -> DevelopParameter? {
        byCompact[compact(name)]
    }

    public static func parameters(kind: ActionKind) -> [DevelopParameter] {
        parameters.filter { $0.kind == kind }
    }

    public static func displayName(for canonical: String) -> String {
        parameter(canonical)?.displayName ?? canonical
    }

    public static func compact(_ name: String) -> String {
        let scalars = name.lowercased().unicodeScalars.filter { CharacterSet.alphanumerics.contains($0) }
        return String(String.UnicodeScalarView(scalars))
    }

    private static let byCompact: [String: DevelopParameter] = {
        var map: [String: DevelopParameter] = [:]
        func add(_ name: String, _ parameter: DevelopParameter) {
            let key = compact(name)
            if !key.isEmpty {
                map[key] = parameter
            }
        }
        for item in document.parameters {
            add(item.canonical, item)
            add(item.displayName, item)
            add(item.sdkName, item)
            if let mask = item.maskSDKName {
                add(mask, item)
            }
            for alias in item.aliases {
                add(alias, item)
            }
        }
        return map
    }()

    private static func load() -> CatalogDocument {
        do {
            let data = try Keymap.resourceData(named: "develop-parameters")
            return try JSONDecoder().decode(CatalogDocument.self, from: data)
        } catch {
            fatalError("develop-parameters.json could not be loaded: \(error)")
        }
    }
}
