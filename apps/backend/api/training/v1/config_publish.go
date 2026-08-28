// 本文件定义发布训练配置版本契约。

package v1

import "github.com/gogf/gf/v2/frame/g"

// PublishConfigReq 发布不可变版本。
type PublishConfigReq struct {
	g.Meta      `path:"/training/configs/{id}/versions" method:"post" tags:"Training" summary:"发布配置版本" dc:"基于当前草稿或提交文件发布新版本。baseVersion 必须等于最新版本，否则返回冲突。发布后清除草稿。" permission:"training:config:update"`
	Id          int64        `json:"id" v:"required|min:1" dc:"配置集 ID" eg:"1"`
	DisplayName string       `json:"displayName" v:"required|max-length:64#请填写显示名称|最长 64 个字符" dc:"显示名称" eg:"SLM 7B Phase4"`
	Framework   string       `json:"framework" v:"required|in:megatron,nemo,accelerate,custom#请选择框架" dc:"框架" eg:"megatron"`
	Visibility  string       `json:"visibility" v:"required|in:team,private#请选择可见性" dc:"可见性" eg:"team"`
	Description string       `json:"description" v:"max-length:256#最长 256 个字符" dc:"描述" eg:""`
	Message     string       `json:"message" v:"required|max-length:256#发布时必须填写版本说明|最长 256 个字符" dc:"版本说明" eg:"学习率降至 1.5e-4"`
	BaseVersion int          `json:"baseVersion" v:"min:0" dc:"基于的最新版本号，首版为 0。须与服务器 latestVersion 一致。" eg:"1"`
	Files       []ConfigFile `json:"files" v:"required" dc:"本版文件，至少一个。"`
}

// PublishConfigRes 返回新版本号。
type PublishConfigRes struct {
	Version int `json:"version" dc:"新版本号" eg:"2"`
}
