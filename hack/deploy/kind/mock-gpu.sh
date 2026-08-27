#!/usr/bin/env bash
# 按文章做法给 kind 工作节点打 GFD 标签，并写回 nvidia.com/gpu 扩展资源。
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../../.." && pwd)"
CLUSTER_NAME="${KIND_CLUSTER:-ltp}"
CONTEXT="kind-${CLUSTER_NAME}"
KEEPER_SRC="${ROOT_DIR}/hack/deploy/kind/mock-gpu-keeper.sh"
KEEPER_DST="/usr/local/bin/ltp-mock-gpu-keeper.sh"
KEEPER_UNIT_SRC="${ROOT_DIR}/hack/deploy/kind/mock-gpu-keeper.service"
KEEPER_UNIT_DST="/etc/systemd/system/ltp-mock-gpu-keeper.service"

kubectl_ctx() {
  kubectl --context "$CONTEXT" "$@"
}

control_plane_container() {
  kind get nodes --name "$CLUSTER_NAME" 2>/dev/null | awk '/control-plane/{print; exit}'
}

node_exists() {
  kubectl_ctx get node "$1" >/dev/null 2>&1
}

# 期望拓扑：三个模拟 GPU 工作节点。名称优先，否则按未打 GPU 标的 worker 依次占用。
profiles=(
  "gpu-node-h200|NVIDIA-H200|8|hopper|143771"
  "gpu-node-h800|NVIDIA-H800|8|hopper|81920"
  "gpu-node-4090|NVIDIA-GeForce-RTX-4090|8|ada|24576"
)

unlabeled_workers=()
while IFS= read -r name; do
  [ -n "$name" ] || continue
  if [ "$(kubectl_ctx get node "$name" -o jsonpath='{.metadata.labels.nvidia\.com/gpu\.present}' 2>/dev/null || true)" = "true" ]; then
    continue
  fi
  unlabeled_workers+=("$name")
done < <(kubectl_ctx get nodes -l '!node-role.kubernetes.io/control-plane' -o jsonpath='{range .items[*]}{.metadata.name}{"\n"}{end}')

assigned=()
next_unlabeled=0
for profile in "${profiles[@]}"; do
  IFS='|' read -r want_name product count family memory <<<"$profile"
  target=""
  if node_exists "$want_name"; then
    target="$want_name"
  else
    while [ "$next_unlabeled" -lt "${#unlabeled_workers[@]}" ]; do
      candidate="${unlabeled_workers[$next_unlabeled]}"
      next_unlabeled=$((next_unlabeled + 1))
      if node_exists "$candidate"; then
        target="$candidate"
        break
      fi
    done
  fi
  if [ -z "$target" ]; then
    echo "未找到足够的工作节点来模拟 GPU（需要 ${want_name} / ${product}）。" >&2
    echo "当前集群仍是旧拓扑时，请执行：make kind.down && make kind.up" >&2
    exit 2
  fi
  assigned+=("${target}|${product}|${count}|${family}|${memory}")
done

echo "写入模拟 GPU 标签…"
for item in "${assigned[@]}"; do
  IFS='|' read -r node product count family memory <<<"$item"
  echo "  ${node}: ${count} x ${product}"
  kubectl_ctx label node "$node" \
    "maip.io/datacenter=cq-lj" \
    "maip.io/gpu-type=${product}" \
    "nvidia.com/gpu.present=true" \
    "nvidia.com/gpu.count=${count}" \
    "nvidia.com/gpu.product=${product}" \
    "nvidia.com/gpu.family=${family}" \
    "nvidia.com/gpu.memory=${memory}" \
    "nvidia.com/cuda.driver-version.full=535.104.05" \
    "nvidia.com/gpu.driver.major=535" \
    "nvidia.com/gpu.driver.minor=104" \
    "nvidia.com/gpu.driver.rev=05" \
    "nvidia.com/mig.capable=false" \
    "nvidia.com/mps.capable=false" \
    --overwrite >/dev/null
  kubectl_ctx patch node "$node" --subresource=status --type=merge \
    -p "{\"status\":{\"capacity\":{\"nvidia.com/gpu\":\"${count}\"},\"allocatable\":{\"nvidia.com/gpu\":\"${count}\"}}}" \
    >/dev/null
done

install_keeper() {
  local container="$1"
  if [ -z "$container" ]; then
    echo "未找到 kind 控制面容器，跳过 GPU 回填进程。" >&2
    return 1
  fi
  if ! command -v docker >/dev/null 2>&1; then
    echo "未找到 docker，无法安装 GPU 回填进程。" >&2
    return 1
  fi
  docker cp "$KEEPER_SRC" "${container}:${KEEPER_DST}" >/dev/null
  docker cp "$KEEPER_UNIT_SRC" "${container}:${KEEPER_UNIT_DST}" >/dev/null
  docker exec "$container" chmod +x "$KEEPER_DST"
  if docker exec "$container" systemctl daemon-reload >/dev/null 2>&1 \
    && docker exec "$container" systemctl enable --now ltp-mock-gpu-keeper.service >/dev/null 2>&1; then
    echo "已在控制面启用 GPU 回填服务。"
    return 0
  fi
  echo "systemd 不可用，改为 docker exec 后台循环写回 GPU。"
  docker exec "$container" bash -c 'pkill -f ltp-mock-gpu-keeper.sh >/dev/null 2>&1 || true'
  docker exec -d "$container" "$KEEPER_DST"
}

echo "安装 GPU 容量回填进程…"
install_keeper "$(control_plane_container)"

echo "等待节点 allocatable 出现 nvidia.com/gpu…"
ok=0
for _ in $(seq 1 24); do
  missing=0
  for item in "${assigned[@]}"; do
    IFS='|' read -r node product count family memory <<<"$item"
    current="$(kubectl_ctx get node "$node" -o jsonpath='{.status.allocatable.nvidia\.com/gpu}' 2>/dev/null || true)"
    if [ "$current" != "$count" ]; then
      missing=1
      break
    fi
  done
  if [ "$missing" -eq 0 ]; then
    ok=1
    break
  fi
  sleep 2
done
if [ "$ok" -ne 1 ]; then
  echo "模拟 GPU 容量未在超时内出现。请检查控制面回填进程。" >&2
  exit 1
fi

echo "模拟 GPU 节点已就绪。"
kubectl_ctx get nodes -o custom-columns='NAME:.metadata.name,GPU:.status.allocatable.nvidia\.com/gpu,TYPE:.metadata.labels.nvidia\.com/gpu\.product,READY:.status.conditions[?(@.type=="Ready")].status'
