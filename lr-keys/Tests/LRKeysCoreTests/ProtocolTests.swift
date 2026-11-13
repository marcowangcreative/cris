import XCTest
@testable import LRKeysCore

final class ProtocolTests: XCTestCase {
    func testParseAndEncode() {
        XCTAssertEqual(
            WireCommand.parse("  inc   Exposure2012   0.1  "),
            .success(.inc(parameter: "Exposure2012", delta: 0.1))
        )
        XCTAssertEqual(
            WireCommand.parse("dec Shadows2012 5"),
            .success(.inc(parameter: "Shadows2012", delta: -5))
        )
        XCTAssertEqual(WireCommand.encode(.inc(parameter: "Shadows2012", delta: -5)), "inc Shadows2012 -5")
        XCTAssertEqual(WireCommand.parse("TOGGLE EnableProfileCorrections"), .success(.toggle(parameter: "EnableProfileCorrections")))
        XCTAssertEqual(WireCommand.parse("run AutoStraighten"), .success(.run(name: "AutoStraighten")))
        XCTAssertEqual(WireCommand.parse("ping 7"), .success(.ping(token: "7")))
        XCTAssertEqual(WireCommand.parse("probe"), .success(.probe))
        XCTAssertEqual(WireCommand.encode(.probe), "probe")

        XCTAssertEqual(WireCommand.parse("inc Exposure2012"), .failure(.badArity("expected inc PARAMETER DELTA")))
        XCTAssertEqual(WireCommand.parse("inc Exposure2012 nope"), .failure(.badNumber("nope")))
        XCTAssertEqual(WireCommand.parse("hello"), .failure(.unknownVerb("hello")))
        XCTAssertEqual(WireCommand.parse("probe now"), .failure(.badArity("expected probe")))
        XCTAssertEqual(WireReply.parse("ok inc Shadows2012 5"), .ok("inc Shadows2012 5"))
        XCTAssertEqual(WireReply.parse("err not in develop"), .err("not in develop"))
        XCTAssertEqual(WireReply.parse("pong 7"), .pong("7"))
    }

    func testSharedProtocolExamples() throws {
        let url = URL(fileURLWithPath: #filePath)
            .deletingLastPathComponent()
            .deletingLastPathComponent()
            .deletingLastPathComponent()
            .appendingPathComponent("testdata/protocol-examples.txt")
        let text = try String(contentsOf: url, encoding: .utf8)
        let lines = text.split(separator: "\n").map(String.init).filter { !$0.isEmpty }
        XCTAssertFalse(lines.isEmpty)
        for line in lines {
            let parsed = WireCommand.parse(line)
            guard case .success = parsed else {
                return XCTFail("\(line) -> \(parsed)")
            }
        }
    }

    func testCompatBlock() throws {
        let lines = [
            "compat begin",
            "compat version lightroom 16.0",
            "compat version sdk 16.0",
            "compat pass parameter Temperature min=1500 max=50000",
            "compat pass parameter Shadows2012 min=-100 max=100",
            "compat skip parameter Texture detail=not in develop",
            "compat fail parameter GoToRemove detail=missing goToRemove",
            "compat pass function goToMasking detail=since 11.0",
            "compat fail function goToRemove detail=missing",
            "compat end",
        ]
        let report = try XCTUnwrap(CompatReport.parse(lines: lines))
        XCTAssertEqual(report.lightroomVersion, "16.0")
        XCTAssertEqual(report.sdkVersion, "16.0")
        XCTAssertEqual(report.passCount, 3)
        XCTAssertEqual(report.failCount, 2)
        XCTAssertEqual(report.skipCount, 1)
        let temperature = try XCTUnwrap(report.entries.first { $0.name == "Temperature" })
        XCTAssertEqual(temperature.minimum, 1500)
        XCTAssertEqual(temperature.maximum, 50000)
        let disabled = report.disabledParameters(in: DevelopCatalog.parameters)
        XCTAssertTrue(disabled.contains("GoToRemove"))
        XCTAssertFalse(disabled.contains("Texture"))
        XCTAssertFalse(disabled.contains("Temperature"))
        XCTAssertNil(CompatReport.parse(lines: ["compat begin", "compat pass function getValue"]))
    }
}
