// 本文件定义保存训练配置草稿契约。

package v1

import "github.com/gogf/gf/v2/frame/g"

// SaveConfigDraftReq 保存个人草稿。
type SaveConfigDraftReq struct {
	g.Meta      `path:"/training/configs/{id}/draft" method:"put" tags:"Training" summary:"保存配置草稿" dc:"覆盖该配置集上当前用户的个人草稿。不要求版本说明。单文件不超过 50 KB。" permission:"training:config:update"`
	Id          int64        `json:"id" v:"required|min:1" dc:"配置集 ID" eg:"1"`
	DisplayName string       `json:"displayName" v:"required|max-length:64#请填写显示名称|最长 64 个字符" dc:"显示名称" eg:"SLM 7B Phase4"`
	Framework   string       `json:"framework" v:"required|in:megatron,nemo,accelerate,custom#请选择框架" dc:"框架" eg:"megatron"`
	Visibility  string       `json:"visibility" v:"required|in:team,private#请选择可见性" dc:"可见性" eg:"team"`
	Description string       `json:"description" v:"max-length:256#最长 256 个字符" dc:"描述" eg:""`
	Message     string       `json:"message" v:"max-length:256#最长 256 个字符" dc:"拟发布说明" eg:""`
	Files       []ConfigFile `json:"files" dc:"草稿文件"`
}

// SaveConfigDraftRes 为空。
type SaveConfigDraftRes struct{}
