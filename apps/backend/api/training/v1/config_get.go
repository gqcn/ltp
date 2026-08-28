// 本文件定义训练配置集详情契约。

package v1

import "github.com/gogf/gf/v2/frame/g"

// GetConfigReq 读取配置集详情。
type GetConfigReq struct {
	g.Meta `path:"/training/configs/{id}" method:"get" tags:"Training" summary:"获取配置集详情" dc:"返回最新已发布版本文件、版本历史摘要，以及当前用户草稿（若有）。" permission:"training:config:query"`
	Id     int64 `json:"id" v:"required|min:1" dc:"配置集 ID" eg:"1"`
}

// ConfigVersionSummary 是版本历史条目。
type ConfigVersionSummary struct {
	Version        int    `json:"version" dc:"版本号" eg:"1"`
	Message        string `json:"message" dc:"版本说明" eg:"初版"`
	AuthorUsername string `json:"authorUsername" dc:"发布人账号" eg:"guoqiang"`
	AuthorNickname string `json:"authorNickname" dc:"发布人显示名" eg:"郭强"`
	Digest         string `json:"digest" dc:"摘要" eg:"a3f8c1d2"`
	FileCount      int    `json:"fileCount" dc:"文件数" eg:"3"`
	CreatedAt      int64  `json:"createdAt" dc:"发布时间，Unix 毫秒时间戳" eg:"1754000000000"`
}

// ConfigDraft 是个人草稿。
type ConfigDraft struct {
	OwnerUsername string       `json:"ownerUsername" dc:"草稿所有人账号" eg:"guoqiang"`
	OwnerNickname string       `json:"ownerNickname" dc:"草稿所有人显示名" eg:"郭强"`
	Message       string       `json:"message" dc:"拟发布说明" eg:"试一试 cosine"`
	Files         []ConfigFile `json:"files" dc:"草稿文件"`
	UpdatedAt     int64        `json:"updatedAt" dc:"更新时间，Unix 毫秒时间戳" eg:"1754000000000"`
}

// GetConfigRes 是配置集详情。
type GetConfigRes struct {
	ConfigListItem
	Description string                 `json:"description" dc:"描述" eg:"7B 预训练主线"`
	Files       []ConfigFile           `json:"files" dc:"最新已发布版本文件。无版本时为空。"`
	Draft       *ConfigDraft           `json:"draft" dc:"当前用户草稿。无则为 null。"`
	Versions    []ConfigVersionSummary `json:"versions" dc:"版本历史，新到旧"`
}
