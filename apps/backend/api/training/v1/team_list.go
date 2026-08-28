// 本文件定义训练中心可选团队列表契约。

package v1

import "github.com/gogf/gf/v2/frame/g"

// ListTeamsReq 列出当前用户可提交任务的团队。
type ListTeamsReq struct {
	g.Meta `path:"/training/teams" method:"get" tags:"Training" summary:"列出可选团队" dc:"普通用户返回自己加入的团队；管理员返回全部团队。用于新建任务与配置集。" permission:"training:team:query"`
}

// TeamItem 是团队名称投影。
type TeamItem struct {
	Id   int64  `json:"id" dc:"团队 ID" eg:"1"`
	Name string `json:"name" dc:"团队名称" eg:"SLM预训练"`
}

// ListTeamsRes 是可选团队列表。
type ListTeamsRes struct {
	List []*TeamItem `json:"list" dc:"团队列表"`
}
