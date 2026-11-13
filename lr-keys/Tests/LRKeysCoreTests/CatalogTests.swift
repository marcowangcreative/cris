import XCTest
@testable import LRKeysCore

final class CatalogTests: XCTestCase {
    func testCatalogComesFromTheDataFile() throws {
        XCTAssertEqual(DevelopCatalog.sdkVersion, "16.0")
        XCTAssertEqual(DevelopCatalog.sdkMinimumVersion, "6.0")
        XCTAssertTrue(DevelopCatalog.temperatureNote.contains("1500"))
        XCTAssertTrue(DevelopCatalog.temperatureNote.contains("-150"))
        let exposure = try XCTUnwrap(DevelopCatalog.parameter("Exposure"))
        XCTAssertEqual(exposure.canonical, "Exposure2012")
        XCTAssertEqual(exposure.defaultStep, 0.1)
        XCTAssertEqual(exposure.sdkName, "Exposure")
        XCTAssertEqual(exposure.maskSDKName, "local_Exposure")
        let temp = try XCTUnwrap(DevelopCatalog.parameter("Color Temperature"))
        XCTAssertEqual(temp.canonical, "Temperature")
        XCTAssertEqual(temp.defaultStep, 100)
        XCTAssertEqual(DevelopCatalog.parameter("Level")?.canonical, "AutoStraighten")
        XCTAssertTrue(DevelopCatalog.functions.contains { $0.name == "goToMasking" })
        XCTAssertTrue(DevelopCatalog.functions.contains { $0.name == "goToRemove" })
        XCTAssertFalse(DevelopCatalog.functions.contains { $0.name == "goToHealing" })
    }

    func testEngineSourcesDoNotHardcodeTheClassic16TemperatureFloor() throws {
        let root = URL(fileURLWithPath: #filePath)
            .deletingLastPathComponent()
            .deletingLastPathComponent()
            .deletingLastPathComponent()
        let paths = [
            "Sources/LRKeysCore/DevelopCatalog.swift",
            "Sources/LRKeysCore/StepMath.swift",
            "Sources/LRKeysCore/Keymap.swift",
            "plugin/LRKeys.lrplugin/LRKeysCore.lua",
        ]
        for relative in paths {
            let text = try String(contentsOf: root.appendingPathComponent(relative), encoding: .utf8)
            XCTAssertFalse(text.contains("1500"), relative)
            XCTAssertFalse(text.contains("-150"), relative)
            XCTAssertFalse(text.contains("goToHealing"), relative)
            XCTAssertFalse(text.contains("goToSpotRemoval"), relative)
            XCTAssertFalse(text.contains("resetBrushing"), relative)
        }
    }
}
