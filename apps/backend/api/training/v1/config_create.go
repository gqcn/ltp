// 本文件定义创建训练配置集契约。

package v1

import "github.com/gogf/gf/v2/frame/g"

// ConfigFile 是配置集中的一个文件。
type ConfigFile struct {
	Path    string `json:"path" v:"required|max-length:128#请填写文件路径|文件路径最长 128 个字符" dc:"相对路径，仅字母数字与 . _ - /" eg:"7b.yaml"`
	Content string `json:"content" dc:"文件内容。单个文件不超过 50 KB。" eg:"seq_len: 8192"`
}

// CreateConfigReq 创建配置集。
type CreateConfigReq struct {
	g.Meta      `path:"/training/configs" method:"post" tags:"Training" summary:"创建配置集" dc:"创建配置集元数据。可同时写入个人草稿文件。同团队显示名称唯一。" permission:"training:config:create"`
	DisplayName string       `json:"displayName" v:"required|max-length:64#请填写显示名称|最长 64 个字符" dc:"显示名称" eg:"SLM 7B Phase4"`
	TeamId      int64        `json:"teamId" v:"required|min:1" dc:"所属团队 ID" eg:"1"`
	Framework   string       `json:"framework" v:"required|in:megatron,nemo,accelerate,custom#请选择框架" dc:"框架模板。" eg:"megatron"`
	Visibility  string       `json:"visibility" v:"required|in:team,private#请选择可见性" dc:"team=团队共享，private=仅自己可见。" eg:"team"`
	Description string       `json:"description" v:"max-length:256#最长 256 个字符" dc:"描述" eg:"7B 预训练主线"`
	Files       []ConfigFile `json:"files" dc:"可选初始文件，作为草稿保存。"`
	Message     string       `json:"message" v:"max-length:256#最长 256 个字符" dc:"草稿中的拟发布说明。" eg:""`
}

// CreateConfigRes 返回配置集 ID。
type CreateConfigRes struct {
	Id int64 `json:"id" dc:"配置集 ID" eg:"1"`
}
