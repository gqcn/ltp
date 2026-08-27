#!/bin/sh
# 在 kind 控制面循环写回 nvidia.com/gpu。kubelet 会覆盖未知扩展资源。
set -eu

KUBECTL="${KUBECTL:-/usr/bin/kubectl}"
if [ ! -x "$KUBECTL" ]; then
  KUBECTL="$(command -v kubectl)"
fi
export KUBECONFIG="${KUBECONFIG:-/etc/kubernetes/admin.conf}"

while true; do
  nodes="$("$KUBECTL" get nodes -l nvidia.com/gpu.present=true -o jsonpath='{range .items[*]}{.metadata.name}{"\n"}{end}' 2>/dev/null || true)"
  for node in $nodes; do
    [ -n "$node" ] || continue
    count="$("$KUBECTL" get node "$node" -o jsonpath='{.metadata.labels.nvidia\.com/gpu\.count}' 2>/dev/null || true)"
    if [ -z "$count" ]; then
      count=8
    fi
    current="$("$KUBECTL" get node "$node" -o jsonpath='{.status.allocatable.nvidia\.com/gpu}' 2>/dev/null || true)"
    if [ "$current" = "$count" ]; then
      continue
    fi
    "$KUBECTL" patch node "$node" --subresource=status --type=merge \
      -p "{\"status\":{\"capacity\":{\"nvidia.com/gpu\":\"${count}\"},\"allocatable\":{\"nvidia.com/gpu\":\"${count}\"}}}" \
      >/dev/null 2>&1 || true
  done
  sleep 5
done
