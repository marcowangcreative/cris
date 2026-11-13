import XCTest
@testable import LRKeysCore

final class ImporterTests: XCTestCase {
    func testPowerKeysMWPExample() throws {
        let url = URL(fileURLWithPath: #filePath)
            .deletingLastPathComponent()
            .deletingLastPathComponent()
            .deletingLastPathComponent()
            .appendingPathComponent("examples/powerkeys-mwp-map.json")
        let result = try PowerKeysImporter.importMap(Data(contentsOf: url))
        XCTAssertEqual(result.keymap.name, "Power Keys MWP Map")
        XCTAssertEqual(result.keymap.multipliers, .powerKeys)
        XCTAssertTrue(result.keymap.issues().isEmpty, result.keymap.issues().joined(separator: ", "))
        XCTAssertEqual(result.keymap.steps["Exposure2012"]?.base, 0.1)
        XCTAssertEqual(result.keymap.steps["Shadows2012"]?.base, 5)
        XCTAssertEqual(result.keymap.bindings.count, 23)
        XCTAssertFalse(result.warnings.isEmpty)
        let decision = result.keymap.decide(keyCode: 1, option: false, shift: false, command: false, control: false, textField: false)
        guard case let .fire(_, command, readout) = decision else {
            return XCTFail("\(decision)")
        }
        XCTAssertEqual(command, .inc(parameter: "Shadows2012", delta: 5))
        XCTAssertEqual(readout, "Shadows +5")
    }

    func testTolerantShapes() throws {
        let dictionary = """
        {"mapName":"Power Keys MWP Map","Exposure":{"down":"q","up":"w","step":0.25},"Profile Corrections":{"key":"[","type":"toggle"},"notes":"hello"}
        """
        let imported = try PowerKeysImporter.importMap(Data(dictionary.utf8))
        XCTAssertEqual(imported.keymap.steps["Exposure2012"]?.base, 0.25)
        XCTAssertTrue(imported.keymap.bindings.contains { $0.key == "q" && $0.direction == .decrease })
        XCTAssertTrue(imported.keymap.bindings.contains { $0.parameter == "EnableProfileCorrections" })

        let flat = """
        {"Exposure.decrease":"q","Exposure.increase":"w","Exposure.amount":0.1,"ShadowsDecrease":"a","ShadowsIncrease":"s","Auto Straighten":";"}
        """
        let flatMap = try PowerKeysImporter.importMap(Data(flat.utf8))
        XCTAssertEqual(flatMap.keymap.bindings.count, 5)
        XCTAssertEqual(flatMap.keymap.steps["Exposure2012"]?.base, 0.1)

        let messy = """
        {"shortcuts":[
          {"name":"EXPOSURE","increase":"W","decrease":"Q","amount":"0.15"},
          {"name":"Not A Real Slider","key":"p"},
          {"slider":"Saturation","plus":"n","minus":"b","step":5},
          "nope",
          {"name":"Whites","increaseKey":["f","F"],"decreaseKey":"d"},
          {"name":"Exposure","increaseKey":13,"decreaseKey":12}
        ]}
        """
        let messyMap = try PowerKeysImporter.importMap(Data(messy.utf8))
        XCTAssertTrue(messyMap.warnings.contains { $0.contains("Not A Real Slider") || $0.contains("unrecognized") })
        XCTAssertGreaterThan(messyMap.keymap.bindings.count, 0)
        XCTAssertFalse(messyMap.keymap.conflicts().isEmpty)

        XCTAssertThrowsError(try PowerKeysImporter.importMap(Data("{".utf8))) { error in
            XCTAssertEqual(error as? ImportFailure, .malformedJSON)
        }
        XCTAssertThrowsError(try PowerKeysImporter.importMap(Data("{\"name\":\"x\"}".utf8))) { error in
            XCTAssertEqual(error as? ImportFailure, .noBindings)
        }
    }

    func testNativeRoundTrip() throws {
        let map = try Keymap.loadDefault()
        let data = try map.encoded()
        let again = try PowerKeysImporter.importMap(data)
        XCTAssertEqual(again.keymap.bindings.count, map.bindings.count)
        XCTAssertEqual(again.keymap.steps["Shadows2012"]?.base, 5)
    }
}
