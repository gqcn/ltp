// 本文件定义训练配置集列表契约。

package v1

import "github.com/gogf/gf/v2/frame/g"

// ListConfigsReq 分页查询配置集。
type ListConfigsReq struct {
	g.Meta    `path:"/training/configs" method:"get" tags:"Training" summary:"列出配置集" dc:"按可见性过滤：private 仅创建人与管理员可见。列表不返回文件内容。" permission:"training:config:query"`
	PageNum   int    `json:"pageNum" d:"1" v:"min:1" dc:"页码" eg:"1"`
	PageSize  int    `json:"pageSize" d:"10" v:"min:1|max:100" dc:"每页条数" eg:"10"`
	Keyword   string `json:"keyword" dc:"可选模糊匹配显示名称或标识。" eg:"slm"`
	TeamId    int64  `json:"teamId" dc:"可选团队 ID。0 表示全部可见团队。" eg:"1"`
	Scope     string `json:"scope" dc:"可选范围。all / mine / team / private / draft。" eg:"all"`
	Status    string `json:"status" dc:"可选状态。all / active / archived。" eg:"active"`
	Framework string `json:"framework" dc:"可选框架。all / megatron / nemo / accelerate / custom。" eg:"megatron"`
}

// ConfigListItem 是配置集列表行。
type ConfigListItem struct {
	Id             int64  `json:"id" dc:"配置集 ID" eg:"1"`
	Name           string `json:"name" dc:"标识" eg:"slm-7b-phase3"`
	DisplayName    string `json:"displayName" dc:"显示名称" eg:"SLM 7B Phase3"`
	TeamId         int64  `json:"teamId" dc:"团队 ID" eg:"1"`
	TeamName       string `json:"teamName" dc:"团队名称" eg:"SLM预训练"`
	Framework      string `json:"framework" dc:"框架。megatron / nemo / accelerate / custom。" eg:"megatron"`
	Visibility     string `json:"visibility" dc:"可见性。team / private。" eg:"team"`
	Status         string `json:"status" dc:"状态。active / archived。" eg:"active"`
	LatestVersion  int    `json:"latestVersion" dc:"最新版本号。无版本为 0。" eg:"12"`
	LatestMessage  string `json:"latestMessage" dc:"最新已发布版本说明。无版本时为空。" eg:"phase4 初版"`
	FileCount      int    `json:"fileCount" dc:"最新版本或草稿文件数" eg:"3"`
	OwnerUsername  string `json:"ownerUsername" dc:"创建人账号" eg:"guoqiang"`
	OwnerNickname  string `json:"ownerNickname" dc:"创建人显示名" eg:"郭强"`
	HasDraft       bool   `json:"hasDraft" dc:"当前用户是否有个人草稿" eg:"true"`
	DraftUpdatedAt int64  `json:"draftUpdatedAt" dc:"草稿更新时间，Unix 毫秒。无草稿为 0。" eg:"1754000000000"`
	UpdatedAt      int64  `json:"updatedAt" dc:"更新时间，Unix 毫秒时间戳" eg:"1754000000000"`
	CreatedAt      int64  `json:"createdAt" dc:"创建时间，Unix 毫秒时间戳" eg:"1754000000000"`
}

// ListConfigsRes 是分页配置集。
type ListConfigsRes struct {
	List  []*ConfigListItem `json:"list" dc:"当前页"`
	Total int               `json:"total" dc:"筛选后总数" eg:"1"`
}
