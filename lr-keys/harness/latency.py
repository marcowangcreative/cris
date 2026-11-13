#!/usr/bin/env python3
"""Mock Lightroom socket and round-trip timer for LR Keys.

The menu-bar app is the TCP client. This process stands in for
LRKeys.lrplugin: it accepts one localhost connection, reads newline
commands, and replies. It does not talk to Lightroom.

Commands:
  inc PARAMETER DELTA
  dec PARAMETER DELTA
  toggle PARAMETER
  run COMMAND
  ping TOKEN
  probe

Replies are `ok <line>`, `err <message>`, `pong <token>`, or a compat block.
"""

from __future__ import annotations

import argparse
import json
import socket
import threading

VERBS = {"inc", "dec", "toggle", "run", "ping", "probe"}


def handle_line(line: str) -> str:
    text = line.strip()
    if not text:
        return ""
    parts = text.split()
    verb = parts[0].lower()
    if verb == "ping":
        if len(parts) != 2:
            return "err bad ping"
        return "pong " + parts[1]
    if verb == "probe":
        if len(parts) != 1:
            return "err expected probe"
        return "\n".join(
            [
                "compat begin",
                "compat version lightroom mock",
                "compat version sdk 16.0",
                "compat pass function goToMasking detail=since 11.0",
                "compat pass function goToRemove detail=since 14.1",
                "compat end",
            ]
        )
    if verb not in VERBS:
        return "err unknown command"
    if verb in {"inc", "dec"}:
        if len(parts) != 3:
            return "err expected inc PARAMETER DELTA"
        try:
            float(parts[2])
        except ValueError:
            return "err bad delta"
    elif len(parts) != 2:
        return "err expected one argument"
    return "ok " + text


class MockLightroom:
    """One-shot or long-running stand-in for the plugin's receive socket."""

    def __init__(self, host: str = "127.0.0.1", port: int = 0) -> None:
        self.sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        self.sock.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
        self.sock.bind((host, port))
        self.sock.listen(1)
        self.host, self.port = self.sock.getsockname()[:2]

    def serve_until_disconnect(self, timeout: float = 5) -> None:
        self.sock.settimeout(timeout)
        connection, _ = self.sock.accept()
        connection.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
        connection.settimeout(timeout)
        buffer = b""
        try:
            while True:
                data = connection.recv(4096)
                if not data:
                    break
                buffer += data
                while b"\n" in buffer:
                    raw, buffer = buffer.split(b"\n", 1)
                    reply = handle_line(raw.decode("utf-8", "replace"))
                    if reply:
                        connection.sendall((reply + "\n").encode("utf-8"))
        finally:
            connection.close()

    def close(self) -> None:
        self.sock.close()


def read_line(sock: socket.socket, timeout: float) -> str:
    sock.settimeout(timeout)
    buffer = b""
    while b"\n" not in buffer:
        chunk = sock.recv(4096)
        if not chunk:
            raise ConnectionError("closed before a full line")
        buffer += chunk
    line, _rest = buffer.split(b"\n", 1)
    return line.decode("utf-8").rstrip("\r")


def measure(port: int, commands: list[str], timeout: float = 2.0) -> list[dict]:
    sock = socket.create_connection(("127.0.0.1", port), timeout=timeout)
    sock.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
    samples = []
    try:
        for command in commands:
            start = time_ns()
            sock.sendall((command + "\n").encode("utf-8"))
            reply = read_line(sock, timeout)
            elapsed_ms = (time_ns() - start) / 1_000_000
            samples.append({"command": command, "reply": reply, "ms": elapsed_ms})
    finally:
        sock.close()
    return samples


def time_ns() -> int:
    # time.perf_counter_ns exists on 3.7+, kept local so the import stays obvious.
    import time

    return time.perf_counter_ns()


def summarize(samples: list[dict]) -> dict:
    times = sorted(sample["ms"] for sample in samples)

    def percentile(fraction: float) -> float:
        if not times:
            return 0.0
        index = round((len(times) - 1) * fraction)
        return times[index]

    failures = [
        sample
        for sample in samples
        if not (
            sample["reply"].startswith("ok ")
            or sample["reply"].startswith("pong ")
            or sample["reply"].startswith("compat ")
        )
    ]
    return {
        "count": len(samples),
        "min_ms": times[0] if times else None,
        "mean_ms": (sum(times) / len(times)) if times else None,
        "p50_ms": percentile(0.50) if times else None,
        "p95_ms": percentile(0.95) if times else None,
        "max_ms": times[-1] if times else None,
        "failures": failures,
    }


def run_self_test(count: int) -> dict:
    server = MockLightroom()
    thread = threading.Thread(target=server.serve_until_disconnect, kwargs={"timeout": 5}, daemon=True)
    thread.start()
    commands = [f"inc Shadows2012 {5 if index % 2 == 0 else -5}" for index in range(count)]
    commands.append("ping 1")
    try:
        samples = measure(server.port, commands)
    finally:
        server.close()
        thread.join(timeout=2)
    return summarize(samples)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Measure LR Keys command round-trip time.")
    parser.add_argument("--count", type=int, default=200)
    parser.add_argument("--port", type=int, default=0, help="Existing server port. 0 starts a mock.")
    parser.add_argument("--serve", action="store_true", help="Run the mock plugin server and wait for one connection.")
    parser.add_argument("--host", default="127.0.0.1")
    args = parser.parse_args(argv)
    if args.serve:
        server = MockLightroom(args.host, args.port or 58421)
        print(json.dumps({"listening": server.port}), flush=True)
        server.serve_until_disconnect(timeout=30)
        server.close()
        return 0
    if args.port:
        commands = ["ping 1", "inc Shadows2012 5"]
        report = summarize(measure(args.port, commands))
    else:
        report = run_self_test(args.count)
    print(json.dumps(report, indent=2))
    expected = args.count + 1 if not args.port else 2
    if report["failures"] or report["count"] != expected:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
