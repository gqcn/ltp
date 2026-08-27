#!/usr/bin/env bash
# 创建本地 kind 集群（Kubernetes 1.27）、模拟 GPU 工作节点，并用 Helm 安装 Volcano 1.13。
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../../.." && pwd)"
CLUSTER_NAME="${KIND_CLUSTER:-ltp}"
KIND_IMAGE="${KIND_IMAGE:-kindest/node:v1.27.16}"
VOLCANO_CHART_VERSION="${VOLCANO_CHART_VERSION:-1.13.0}"
CONFIG="${ROOT_DIR}/hack/deploy/kind/cluster.yaml"
CONTEXT="kind-${CLUSTER_NAME}"

need() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "缺少命令 $1。请先安装 kind、kubectl 与 helm。" >&2
    exit 1
  fi
}

need kind
need kubectl
need helm
if ! command -v docker >/dev/null 2>&1; then
  echo "缺少命令 docker。kind 节点容器依赖 docker 安装 GPU 回填进程。" >&2
  exit 1
fi

if kind get clusters 2>/dev/null | grep -qx "$CLUSTER_NAME"; then
  echo "kind 集群 ${CLUSTER_NAME} 已存在，跳过创建。"
else
  echo "创建 kind 集群 ${CLUSTER_NAME}（镜像 ${KIND_IMAGE}，含模拟 GPU 工作节点）…"
  kind create cluster --name "$CLUSTER_NAME" --image "$KIND_IMAGE" --config "$CONFIG" --wait 180s
fi

kubectl config use-context "$CONTEXT" >/dev/null
kubectl cluster-info --context "$CONTEXT"

echo "等待全部节点 Ready…"
kubectl --context "$CONTEXT" wait --for=condition=Ready nodes --all --timeout=180s >/dev/null

worker_count="$(kubectl --context "$CONTEXT" get nodes -l '!node-role.kubernetes.io/control-plane' --no-headers 2>/dev/null | wc -l | tr -d ' ')"
if [ "${worker_count:-0}" -lt 3 ]; then
  echo
  echo "当前集群没有足够的工作节点来模拟 GPU（需要 3 个 worker，实际 ${worker_count:-0}）。" >&2
  echo "这通常是旧的单节点拓扑。请重建：" >&2
  echo "  make kind.down && make kind.up" >&2
  exit 1
fi
bash "${ROOT_DIR}/hack/deploy/kind/mock-gpu.sh"

if ! helm repo list 2>/dev/null | awk '{print $1}' | grep -qx volcano-sh; then
  helm repo add volcano-sh https://volcano-sh.github.io/helm-charts
fi
helm repo update volcano-sh >/dev/null

echo "安装 Volcano ${VOLCANO_CHART_VERSION} 到 volcano-system…"
helm upgrade --install volcano volcano-sh/volcano \
  --kube-context "$CONTEXT" \
  --namespace volcano-system \
  --create-namespace \
  --version "$VOLCANO_CHART_VERSION" \
  --wait \
  --timeout 5m

echo "等待 Queue CRD…"
kubectl --context "$CONTEXT" wait --for=condition=Established crd/queues.scheduling.volcano.sh --timeout=120s

echo
echo "kind 集群已就绪。"
echo "  context:    ${CONTEXT}"
echo "  kubeconfig: kind get kubeconfig --name ${CLUSTER_NAME}"
echo "  volcano:    kubectl --context ${CONTEXT} get pods -n volcano-system"
echo "  gpu nodes:  kubectl --context ${CONTEXT} get nodes -o custom-columns=NAME:.metadata.name,GPU:.status.allocatable.nvidia\\.com/gpu,TYPE:.metadata.labels.nvidia\\.com/gpu\\.product"
echo "在控制台「集群管理」中粘贴上述 kubeconfig 即可接入。"
