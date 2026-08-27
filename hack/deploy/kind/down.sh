#!/usr/bin/env bash
# 删除本地 kind 集群 ltp。
set -euo pipefail

CLUSTER_NAME="${KIND_CLUSTER:-ltp}"

if ! command -v kind >/dev/null 2>&1; then
  echo "未找到 kind，无需删除。"
  exit 0
fi

if kind get clusters 2>/dev/null | grep -qx "$CLUSTER_NAME"; then
  kind delete cluster --name "$CLUSTER_NAME"
  echo "已删除 kind 集群 ${CLUSTER_NAME}。"
else
  echo "kind 集群 ${CLUSTER_NAME} 不存在。"
fi
