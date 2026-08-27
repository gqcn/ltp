// 本文件用 client-go 与 Volcano 类型化客户端从 Kubeconfig 构造集群客户端。

package kube

import (
	"context"

	"github.com/gogf/gf/v2/errors/gerror"
	"k8s.io/client-go/kubernetes"
	"volcano.sh/apis/pkg/client/clientset/versioned"
)

type liveClient struct {
	typed   kubernetes.Interface // 核心资源客户端
	volcano versioned.Interface  // Volcano 类型化客户端
	host    string               // API Server
}

// ClientFor 解析 Kubeconfig 并构造 liveClient。
func (factory) ClientFor(ctx context.Context, kubeconfig []byte) (ClusterClient, error) {
	_ = ctx
	cfg, err := restConfigFromContent(kubeconfig)
	if err != nil {
		return nil, err
	}
	typed, err := kubernetes.NewForConfig(cfg)
	if err != nil {
		return nil, gerror.Wrap(err, "create kubernetes client")
	}
	vc, err := versioned.NewForConfig(cfg)
	if err != nil {
		return nil, gerror.Wrap(err, "create volcano client")
	}
	return &liveClient{typed: typed, volcano: vc, host: cfg.Host}, nil
}
