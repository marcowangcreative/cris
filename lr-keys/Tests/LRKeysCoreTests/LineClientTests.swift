import XCTest
@testable import LRKeysCore

final class LineClientTests: XCTestCase {
    func testRoundTripAgainstAMockServer() throws {
        let server = LineServer()
        let port = try server.start()
        let done = expectation(description: "server finished")
        DispatchQueue.global().async {
            do {
                try server.serve { line in
                    if line.hasPrefix("ping ") {
                        return "pong " + String(line.dropFirst(5))
                    }
                    if line == "probe" {
                        return "compat begin"
                    }
                    return "ok " + line
                }
            } catch {
                XCTFail("server \(error)")
            }
            done.fulfill()
        }

        let client = LineClient()
        try client.connect(port: port, timeout: 2)
        let started = Date()
        try client.sendLine("ping 1")
        XCTAssertEqual(try client.receiveLine(timeout: 2), "pong 1")
        try client.sendLine(WireCommand.encode(.inc(parameter: "Shadows2012", delta: 5)))
        XCTAssertEqual(try client.receiveLine(timeout: 2), "ok inc Shadows2012 5")
        let elapsed = Date().timeIntervalSince(started)
        XCTAssertLessThan(elapsed, 1)
        client.close()
        wait(for: [done], timeout: 3)
        server.stop()
    }
}
