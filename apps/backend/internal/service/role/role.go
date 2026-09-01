// Package role 实现平台内置角色查询与改名。
package role

import (
	"context"
	"encoding/json"
	"strings"
)

const maxRoleNameLen = 32

// Code 是内置角色编码。
type Code string

const (
	// CodeAlgo 是算法工程师角色。
	CodeAlgo Code = "algo"
	// CodeSRE 是 SRE 工程师角色。
	CodeSRE Code = "sre"
)

// MenuSection 是侧栏菜单分区。
type MenuSection string

const (
	// MenuTraining 是训练中心。
	MenuTraining MenuSection = "training"
	// MenuOps 是运维中心。
	MenuOps MenuSection = "ops"
	// MenuPlatform 是平台中心。
	MenuPlatform MenuSection = "platform"
)

// Item 是角色投影。
type Item struct {
	ID          int64    // 主键
	Code        Code     // 角色编码
	Name        string   // 显示名称
	Description string   // 描述
	Menus       []string // 菜单分区
	Builtin     bool     // 是否内置
	UserCount   int      // 用户数
	UpdatedBy   string   // 最近更新人
	UpdatedAt   int64    // 最近更新时间
}

// Service 暴露角色管理操作。
type Service interface {
	// List 返回内置角色，用户数一次批量统计。
	List(ctx context.Context) ([]*Item, error)
	// Rename 修改角色显示名称，不改变编码与菜单范围。
	Rename(ctx context.Context, id int64, name string, updatedBy string) error
	// GetByCode 按编码读取角色。不存在时返回 CodeNotFound。
	GetByCode(ctx context.Context, code Code) (*Item, error)
}

var _ Service = (*serviceImpl)(nil)

type serviceImpl struct{}

// New 构造角色服务。
func New() Service {
	return &serviceImpl{}
}

// ParseCode 解析角色编码。
func ParseCode(raw string) (Code, bool) {
	switch Code(strings.TrimSpace(raw)) {
	case CodeAlgo:
		return CodeAlgo, true
	case CodeSRE:
		return CodeSRE, true
	default:
		return "", false
	}
}

// SeesAllTeamData 表示平台管理员与 SRE 可查看全部团队的训练数据，不受成员关系限制。
func SeesAllTeamData(isAdmin bool, code Code) bool {
	return isAdmin || code == CodeSRE
}

// AllMenus 返回管理员可见的全部菜单分区。
func AllMenus() []string {
	return []string{string(MenuTraining), string(MenuOps), string(MenuPlatform)}
}

func parseMenus(raw string) []string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return []string{}
	}
	var menus []string
	if err := json.Unmarshal([]byte(raw), &menus); err != nil {
		return []string{}
	}
	out := make([]string, 0, len(menus))
	for _, item := range menus {
		item = strings.TrimSpace(item)
		if item == "" {
			continue
		}
		out = append(out, item)
	}
	return out
}
