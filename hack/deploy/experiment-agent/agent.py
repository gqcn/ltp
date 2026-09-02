#!/usr/bin/env python3
"""实验代理：metrics 读取 tfevents 标量；serve 启动 TensorBoard；demo 写入完整演示曲线。"""

from __future__ import annotations

import argparse
import gzip
import http.client
import json
import math
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

TB_INTERNAL_PORT = 6007
_HOP_BY_HOP = {
    "connection",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailers",
    "transfer-encoding",
    "upgrade",
    "host",
    "accept-encoding",
}

LOSS_TAGS = ("lm loss", "lm-loss", "loss", "train_loss", "Loss")
TPS_TAGS = ("tokens_per_sec", "tokens/sec", "throughput")
MAX_STEPS_TAGS = ("max_steps", "num_train_steps", "train/total_steps")
DEMO_STEPS = 80


def _last_scalar(acc, names):
    tags = acc.Tags().get("scalars") or []
    for name in names:
        if name in tags:
            events = acc.Scalars(name)
            if events:
                last = events[-1]
                return last.step, last.value
    return None, None


def _as_float(value):
    if value is None:
        return None
    return float(value)


def _as_int(value):
    if value is None:
        return None
    return int(value)


def run_metrics(logdir: str) -> None:
    logdir = logdir or os.environ.get("TENSORBOARD_LOGDIR", "")
    if not logdir or not os.path.isdir(logdir):
        print(json.dumps({"ok": False, "error": "未读到指标"}, ensure_ascii=False))
        return
    try:
        from tensorboard.backend.event_processing.event_accumulator import EventAccumulator
    except ImportError:
        print(json.dumps({"ok": False, "error": "未安装 tensorboard"}, ensure_ascii=False))
        return
    acc = EventAccumulator(logdir)
    acc.Reload()
    tags = acc.Tags().get("scalars") or []
    if not tags and os.path.isdir(os.path.join(logdir, "train")):
        acc = EventAccumulator(os.path.join(logdir, "train"))
        acc.Reload()
        tags = acc.Tags().get("scalars") or []
    step, loss = _last_scalar(acc, LOSS_TAGS)
    _, tps = _last_scalar(acc, TPS_TAGS)
    _, max_steps_val = _last_scalar(acc, MAX_STEPS_TAGS)
    if step is None:
        for tag in tags:
            events = acc.Scalars(tag)
            if events:
                step = events[-1].step
                break
    if loss is None and tps is None and step is None:
        print(json.dumps({"ok": False, "error": "未读到指标", "tags": tags}, ensure_ascii=False))
        return
    max_steps = _as_int(max_steps_val)
    print(
        json.dumps(
            {
                "ok": True,
                "step": _as_int(step),
                "loss": _as_float(loss),
                "tokensPerSec": _as_float(tps),
                "maxSteps": max_steps,
                "tags": tags,
            },
            ensure_ascii=False,
        )
    )


def _write_scalar(writer, tag: str, step: int, value: float, wall: float) -> None:
    from tensorboard.compat.proto.event_pb2 import Event
    from tensorboard.compat.proto.summary_pb2 import Summary

    event = Event(
        wall_time=wall,
        step=step,
        summary=Summary(value=[Summary.Value(tag=tag, simple_value=float(value))]),
    )
    writer.add_event(event)


def run_demo(logdir: str) -> None:
    logdir = logdir or os.environ.get("TENSORBOARD_LOGDIR", "")
    if not logdir:
        print("TENSORBOARD_LOGDIR 未设置", file=sys.stderr)
        sys.exit(1)
    try:
        from tensorboard.summary.writer.event_file_writer import EventFileWriter
    except ImportError:
        print("未安装 tensorboard", file=sys.stderr)
        sys.exit(1)
    os.makedirs(logdir, exist_ok=True)
    writer = EventFileWriter(logdir)
    now = time.time()
    for step in range(1, DEMO_STEPS + 1):
        wall = now + step * 0.25
        loss = round(2.6 * math.exp(-step / 28.0) + 1.18, 6)
        tps = round(1_150_000 + 40_000 * math.sin(step / 9.0), 2)
        _write_scalar(writer, "lm loss", step, loss, wall)
        _write_scalar(writer, "tokens_per_sec", step, tps, wall)
        _write_scalar(writer, "max_steps", step, float(DEMO_STEPS), wall)
    writer.flush()
    writer.close()


def _wait_http(url: str) -> None:
    deadline = time.time() + 30
    while time.time() < deadline:
        try:
            urllib.request.urlopen(url, timeout=1)
            return
        except urllib.error.HTTPError:
            return
        except OSError:
            time.sleep(0.2)
    raise SystemExit("TensorBoard 启动超时")


def _serve_front_proxy(listen_port: int, tb_port: int) -> None:
    class FrontProxy(BaseHTTPRequestHandler):
        def do_GET(self) -> None:
            self._forward()

        def do_POST(self) -> None:
            self._forward()

        def do_HEAD(self) -> None:
            self._forward()

        def log_message(self, fmt: str, *args) -> None:
            return

        def _forward(self) -> None:
            length = int(self.headers.get("Content-Length") or 0)
            body = self.rfile.read(length) if length else None
            headers = {k: v for k, v in self.headers.items() if k.lower() not in _HOP_BY_HOP}
            conn = http.client.HTTPConnection("127.0.0.1", tb_port, timeout=60)
            try:
                conn.request(self.command, self.path, body=body, headers=headers)
                resp = conn.getresponse()
                payload = resp.read()
                if (resp.getheader("Content-Encoding") or "").lower() == "gzip":
                    payload = gzip.decompress(payload)
            except (OSError, http.client.HTTPException) as exc:
                msg = str(exc).encode()
                self.send_response(502)
                self.send_header("Content-Type", "text/plain; charset=utf-8")
                self.send_header("Content-Length", str(len(msg)))
                self.end_headers()
                if self.command != "HEAD":
                    self.wfile.write(msg)
                return
            finally:
                conn.close()
            self.send_response(resp.status)
            content_type = resp.getheader("Content-Type")
            if content_type:
                self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            if self.command != "HEAD":
                self.wfile.write(payload)

    ThreadingHTTPServer(("0.0.0.0", listen_port), FrontProxy).serve_forever()


def run_serve(logdir: str, port: str, path_prefix: str) -> None:
    """在 6006 提供标准 HTTP 入口，后端把 TensorBoard 反代到平台服务地址。path_prefix 仅为兼容旧参数。"""
    logdir = logdir or os.environ.get("TENSORBOARD_LOGDIR", "") or "."
    listen = int(port or "6006")
    tb = subprocess.Popen(
        [
            "tensorboard",
            "--logdir",
            logdir,
            "--host",
            "127.0.0.1",
            "--port",
            str(TB_INTERNAL_PORT),
        ]
    )
    try:
        _wait_http(f"http://127.0.0.1:{TB_INTERNAL_PORT}/")
        _serve_front_proxy(listen, TB_INTERNAL_PORT)
    finally:
        tb.terminate()
        try:
            tb.wait(timeout=5)
        except subprocess.TimeoutExpired:
            tb.kill()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=("metrics", "serve", "demo"))
    parser.add_argument("--logdir", default="")
    parser.add_argument("--port", default="6006")
    parser.add_argument("--path_prefix", default="")
    args = parser.parse_args()
    if args.command == "metrics":
        run_metrics(args.logdir)
        return 0
    if args.command == "demo":
        run_demo(args.logdir)
        return 0
    run_serve(args.logdir, args.port, args.path_prefix)
    return 0


if __name__ == "__main__":
    sys.exit(main())
