// 本文件定义归档或恢复训练配置集契约。

package v1

import "github.com/gogf/gf/v2/frame/g"

// UpdateConfigStatusReq 归档或恢复配置集。
type UpdateConfigStatusReq struct {
	g.Meta `path:"/training/configs/{id}/status" method:"put" tags:"Training" summary:"更新配置集状态" dc:"归档后新建任务下拉不再出现该配置集。历史任务挂载快照仍可查看。" permission:"training:config:update"`
	Id     int64  `json:"id" v:"required|min:1" dc:"配置集 ID" eg:"1"`
	Status string `json:"status" v:"required|in:active,archived#请选择状态" dc:"active=使用中，archived=已归档。" eg:"archived"`
}

// UpdateConfigStatusRes 为空。
type UpdateConfigStatusRes struct{}
