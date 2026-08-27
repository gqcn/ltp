// 本文件按 ACS kubeclient 方式解析 Kubeconfig：Load + BearerToken 回填。

package kube

import (
	"time"

	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"

	"github.com/gqcn/ltp/pkg/bizerr"
)

const (
	defaultUserAgent  = "ltp-client"
	defaultAPITimeout = 15 * time.Second
)

// restConfigFromContent 从 kubeconfig 文本构造 REST 配置。
// 兼容 HTTPS 证书与「HTTP + BearerToken」反向代理两种接入方式。
func restConfigFromContent(kubeconfig []byte) (*rest.Config, error) {
	loaded, err := clientcmd.Load(kubeconfig)
	if err != nil {
		return nil, bizerr.Wrap(err, CodeInvalidKubeconfig)
	}
	cfg, err := clientcmd.NewDefaultClientConfig(*loaded, &clientcmd.ConfigOverrides{}).ClientConfig()
	if err != nil {
		return nil, bizerr.Wrap(err, CodeInvalidKubeconfig)
	}
	if cfg.BearerToken == "" {
		current := loaded.CurrentContext
		if current == "" {
			return nil, bizerr.New(CodeInvalidKubeconfig)
		}
		ctxInfo, ok := loaded.Contexts[current]
		if !ok || ctxInfo == nil {
			return nil, bizerr.New(CodeInvalidKubeconfig)
		}
		if user, exists := loaded.AuthInfos[ctxInfo.AuthInfo]; exists && user != nil && user.Token != "" {
			cfg.BearerToken = user.Token
		}
	}
	cfg.UserAgent = defaultUserAgent
	cfg.Timeout = defaultAPITimeout
	return cfg, nil
}
