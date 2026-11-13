import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import latency


class LatencyTests(unittest.TestCase):
    def test_handle_line(self) -> None:
        self.assertEqual(latency.handle_line("inc Shadows2012 5"), "ok inc Shadows2012 5")
        self.assertEqual(latency.handle_line("dec Exposure2012 0.1"), "ok dec Exposure2012 0.1")
        self.assertEqual(latency.handle_line("toggle EnableProfileCorrections"), "ok toggle EnableProfileCorrections")
        self.assertEqual(latency.handle_line("run AutoStraighten"), "ok run AutoStraighten")
        self.assertEqual(latency.handle_line("ping 7"), "pong 7")
        self.assertTrue(latency.handle_line("probe").startswith("compat begin"))
        self.assertTrue(latency.handle_line("probe").rstrip().endswith("compat end"))
        self.assertTrue(latency.handle_line("nope").startswith("err"))
        self.assertTrue(latency.handle_line("inc Shadows2012 nope").startswith("err"))

    def test_shared_protocol_examples(self) -> None:
        path = Path(__file__).resolve().parents[1] / "testdata" / "protocol-examples.txt"
        for line in path.read_text().splitlines():
            if not line.strip():
                continue
            reply = latency.handle_line(line)
            self.assertTrue(reply.startswith("ok ") or reply.startswith("pong "), reply)

    def test_round_trip(self) -> None:
        report = latency.run_self_test(40)
        self.assertEqual(report["count"], 41)
        self.assertEqual(report["failures"], [])
        self.assertGreaterEqual(report["min_ms"], 0)
        self.assertLess(report["p50_ms"], 50)
        self.assertGreaterEqual(report["max_ms"], report["p50_ms"])


if __name__ == "__main__":
    unittest.main()
