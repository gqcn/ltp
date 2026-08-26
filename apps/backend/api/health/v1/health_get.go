// 本文件定义无需登录的健康检查接口契约。

package v1

import "github.com/gogf/gf/v2/frame/g"

// GetReq 检查 HTTP 进程是否存活。
type GetReq struct {
	g.Meta `path:"/health" method:"get" tags:"Health" summary:"健康检查" dc:"返回进程存活状态，供本地开发与反向代理使用。该接口无需认证。"`
}

// GetRes 是健康检查载荷。
type GetRes struct {
	Status string `json:"status" dc:"进程状态" eg:"ok"`
}
