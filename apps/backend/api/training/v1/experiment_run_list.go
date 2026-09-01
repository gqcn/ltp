// 本文件定义实验 Run 列表契约。

package v1

import "github.com/gogf/gf/v2/frame/g"

// ListExperimentRunsReq 分页查询 Run。
type ListExperimentRunsReq struct {
	g.Meta    `path:"/training/experiments" method:"get" tags:"Training" summary:"列出实验 Run" dc:"按工作集群列出 Run。算法工程师仅见自己加入的团队；平台管理员与 SRE 可见全部团队。筛选与分页在数据库完成。" permission:"training:experiment:query"`
	ClusterId int64  `json:"clusterId" v:"required|min:1" dc:"工作集群 ID。" eg:"1"`
	PageNum   int    `json:"pageNum" d:"1" v:"min:1" dc:"页码，从 1 开始。" eg:"1"`
	PageSize  int    `json:"pageSize" d:"10" v:"min:1|max:100" dc:"每页条数。默认 10，最大 100。" eg:"10"`
	ProjectId int64  `json:"projectId" dc:"可选项目 ID。0 或不传表示全部未删除项目下的 Run。" eg:"1"`
	Keyword   string `json:"keyword" dc:"可选模糊匹配 Run 名、任务名或创建人。" eg:"slm"`
	Status    string `json:"status" dc:"可选关联任务状态。all 或不传表示全部；queued / starting / running / success / failed / cancelled。" eg:"running"`
	Owner     string `json:"owner" dc:"可选创建人账号。空表示全部。" eg:"guoqiang"`
	Sort      string `json:"sort" dc:"可选排序。updated_desc / created_desc / loss_asc / loss_desc。默认 updated_desc。" eg:"updated_desc"`
}

// ExperimentRunListItem 是 Run 列表行。
type ExperimentRunListItem struct {
	Id             int64    `json:"id" dc:"Run ID" eg:"1"`
	Name           string   `json:"name" dc:"Run 名称" eg:"slm-7b-pretrain-phase4"`
	ProjectId      int64    `json:"projectId" dc:"项目 ID" eg:"1"`
	ProjectName    string   `json:"projectName" dc:"项目名称" eg:"默认项目"`
	ClusterId      int64    `json:"clusterId" dc:"集群 ID" eg:"1"`
	TeamId         int64    `json:"teamId" dc:"团队 ID" eg:"1"`
	TeamName       string   `json:"teamName" dc:"团队名称" eg:"SLM预训练"`
	JobId          int64    `json:"jobId" dc:"关联任务 ID。无任务为 0。" eg:"12"`
	JobName        string   `json:"jobName" dc:"关联任务名称" eg:"slm-7b-pretrain-phase4"`
	JobStatus      string   `json:"jobStatus" dc:"关联任务状态。queued / starting / running / success / failed / cancelled。无任务为空。" eg:"running"`
	DatacenterCode string   `json:"datacenterCode" dc:"机房标识" eg:"cq-lj"`
	TbLogdir       string   `json:"tbLogdir" dc:"TensorBoard logdir" eg:"/data/hpc/home/guoqiang/outputs/job/tensorboard"`
	OwnerUsername  string   `json:"ownerUsername" dc:"创建人账号" eg:"guoqiang"`
	OwnerNickname  string   `json:"ownerNickname" dc:"创建人显示名" eg:"郭强"`
	Loss           *float64 `json:"loss" dc:"最新 Loss。未上报为 null。" eg:"1.822"`
	Step           *int64   `json:"step" dc:"最新 step。未上报为 null。" eg:"21000"`
	MaxSteps       *int64   `json:"maxSteps" dc:"进度分母。未知为 null。" eg:"50000"`
	TokensPerSec   *float64 `json:"tokensPerSec" dc:"最新吞吐。未上报为 null。" eg:"1180000"`
	MetricsAt      int64    `json:"metricsAt" dc:"最近成功读盘时间，Unix timestamp in milliseconds。未读过为 0。" eg:"1754000000000"`
	MetricsError   string   `json:"metricsError" dc:"最近读盘失败说明。正常为空。" eg:""`
	CreatedAt      int64    `json:"createdAt" dc:"创建时间，Unix timestamp in milliseconds" eg:"1754000000000"`
	UpdatedAt      int64    `json:"updatedAt" dc:"更新时间，Unix timestamp in milliseconds" eg:"1754000000000"`
}

// ListExperimentRunsRes 是分页 Run。
type ListExperimentRunsRes struct {
	List  []*ExperimentRunListItem `json:"list" dc:"当前页"`
	Total int                      `json:"total" dc:"筛选后总数" eg:"8"`
}
