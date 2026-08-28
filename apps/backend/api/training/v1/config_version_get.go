// 本文件定义读取训练配置历史版本契约。

package v1

import "github.com/gogf/gf/v2/frame/g"

// GetConfigVersionReq 读取指定历史版本文件。
type GetConfigVersionReq struct {
	g.Meta  `path:"/training/configs/{id}/versions/{version}" method:"get" tags:"Training" summary:"获取配置版本" dc:"只读返回某一不可变版本的文件。" permission:"training:config:query"`
	Id      int64 `json:"id" v:"required|min:1" dc:"配置集 ID" eg:"1"`
	Version int   `json:"version" v:"required|min:1" dc:"版本号" eg:"1"`
}

// GetConfigVersionRes 是历史版本详情。
type GetConfigVersionRes struct {
	ConfigVersionSummary
	Files []ConfigFile `json:"files" dc:"该版本文件"`
}
