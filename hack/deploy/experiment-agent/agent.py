#!/usr/bin/env python3
"""实验代理：metrics 读取 tfevents 标量；serve 启动 TensorBoard。"""

from __future__ import annotations

import argparse
import json
import os
import sys

LOSS_TAGS = ("lm loss", "lm-loss", "loss", "train_loss", "Loss")
TPS_TAGS = ("tokens_per_sec", "tokens/sec", "throughput")


def _last_scalar(acc, names):
    tags = acc.Tags().get("scalars") or []
    for name in names:
        if name in tags:
            events = acc.Scalars(name)
            if events:
                last = events[-1]
                return last.step, last.value
    return None, None


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
    if step is None:
        for tag in tags:
            events = acc.Scalars(tag)
            if events:
                step = events[-1].step
                break
    if loss is None and tps is None and step is None:
        print(json.dumps({"ok": False, "error": "未读到指标", "tags": tags}, ensure_ascii=False))
        return
    print(
        json.dumps(
            {"ok": True, "step": step, "loss": loss, "tokensPerSec": tps, "tags": tags},
            ensure_ascii=False,
        )
    )


def run_serve(logdir: str, port: str, path_prefix: str) -> None:
    logdir = logdir or os.environ.get("TENSORBOARD_LOGDIR", "")
    args = [
        "tensorboard",
        "--logdir",
        logdir or ".",
        "--bind_all",
        "--port",
        port or "6006",
    ]
    if path_prefix:
        args.extend(["--path_prefix", path_prefix])
    os.execvp("tensorboard", args)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=("metrics", "serve"))
    parser.add_argument("--logdir", default="")
    parser.add_argument("--port", default="6006")
    parser.add_argument("--path_prefix", default="")
    args = parser.parse_args()
    if args.command == "metrics":
        run_metrics(args.logdir)
        return 0
    run_serve(args.logdir, args.port, args.path_prefix)
    return 0


if __name__ == "__main__":
    sys.exit(main())
