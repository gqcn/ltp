// Package ldap 实现平台级 LDAP 配置、连接测试、目录检索与用户绑定。
package ldap

import (
	"context"
	"time"

	"github.com/gogf/gf/v2/errors/gerror"
)

const (
	configCodeDefault     = "default"
	defaultTimeoutSec     = 10
	maxTimeoutSec         = 120
	maxDirectorySize      = 50
	maxLookupSize         = 100
	filterUsernameToken   = "{username}"
	filterQueryToken      = "{q}"
	defaultUserFilter     = "(&(objectClass=inetOrgPerson)(uid={username}))"
	defaultSearchFilter   = "(|(uid=*{q}*)(cn=*{q}*)(mail=*{q}*))"
	defaultAttrUsername   = "uid"
	defaultAttrName       = "cn"
	defaultAttrEmail      = "mail"
	defaultAttrDepartment = "ou"
	defaultAttrTitle      = "title"
)

// TestResult 是 LDAP 连接测试结果。
type TestResult string

const (
	// TestResultSuccess 表示最近一次测试成功。
	TestResultSuccess TestResult = "success"
	// TestResultFail 表示最近一次测试失败。
	TestResultFail TestResult = "fail"
)

// Config 是运行期 LDAP 连接参数。
type Config struct {
	Name           string // 配置名称
	Host           string // 主机
	Port           int    // 端口
	UseTLS         bool   // 是否 TLS
	BaseDN         string // Base DN
	BindDN         string // 绑定 DN
	BindPassword   string // 绑定密码
	UserFilter     string // 用户绑定过滤器
	SearchFilter   string // 目录检索过滤器
	AttrUsername   string // 账号属性
	AttrName       string // 姓名属性
	AttrEmail      string // 邮箱属性
	AttrDepartment string // 部门属性
	AttrTitle      string // 职位属性
	TimeoutSec     int    // 超时秒数
}

// View 是对外配置投影，不含绑定密码明文。
type View struct {
	Name            string     // 配置名称
	Host            string     // 主机
	Port            int        // 端口
	UseTLS          bool       // 是否 TLS
	BaseDN          string     // Base DN
	BindDN          string     // 绑定 DN
	BindPasswordSet bool       // 是否已保存密码
	UserFilter      string     // 用户绑定过滤器
	SearchFilter    string     // 目录检索过滤器
	AttrUsername    string     // 账号属性
	AttrName        string     // 姓名属性
	AttrEmail       string     // 邮箱属性
	AttrDepartment  string     // 部门属性
	AttrTitle       string     // 职位属性
	TimeoutSec      int        // 超时秒数
	LastTestAt      int64      // 最近测试时间
	LastTestResult  TestResult // 最近测试结果
	LastTestMessage string     // 最近测试说明
	UpdatedBy       string     // 最近更新人
	UpdatedAt       int64      // 最近更新时间
}

// SaveInput 是保存配置命令。BindPassword 为空表示不修改已保存密码。
type SaveInput struct {
	Name           string // 配置名称
	Host           string // 主机
	Port           int    // 端口
	UseTLS         bool   // 是否 TLS
	BaseDN         string // Base DN
	BindDN         string // 绑定 DN
	BindPassword   string // 绑定密码，空表示不改
	UserFilter     string // 用户绑定过滤器
	SearchFilter   string // 目录检索过滤器
	AttrUsername   string // 账号属性
	AttrName       string // 姓名属性
	AttrEmail      string // 邮箱属性
	AttrDepartment string // 部门属性
	AttrTitle      string // 职位属性
	TimeoutSec     int    // 超时秒数
	UpdatedBy      string // 更新人
}

// Entry 是一条目录用户投影。
type Entry struct {
	Username   string // 账号
	Name       string // 显示名
	Email      string // 邮箱
	Department string // 部门
	Title      string // 职位
	DN         string // 条目 DN
}

// ProbeResult 是连接测试的业务结果。探测失败不是系统错误。
type ProbeResult struct {
	OK      bool   // 是否连通
	Message string // 探测说明
	Config  *View  // 探测后的配置投影
}

// Directory 隔离真实 LDAP 协议访问，便于测试注入替身。
type Directory interface {
	// Ping 使用服务账号绑定并确认 Base DN 可检索。
	Ping(ctx context.Context, cfg Config) error
	// BindUser 解析用户 DN 并以用户密码绑定。
	BindUser(ctx context.Context, cfg Config, username string, password string) error
	// Search 按 LDAP 过滤器检索条目，limit 为返回上限。
	Search(ctx context.Context, cfg Config, filter string, limit int) ([]Entry, error)
}

// Service 暴露 LDAP 配置与目录操作。
type Service interface {
	// GetConfig 返回当前平台 LDAP 配置。尚未初始化时返回 CodeNotConfigured。
	GetConfig(ctx context.Context) (*View, error)
	// SaveConfig 保存连接参数。密码为空时保留原密码。
	SaveConfig(ctx context.Context, in SaveInput) (*View, error)
	// TestConfig 使用表单参数探测连接，并将测试结果写入已保存配置。连接失败时 OK 为 false，不返回错误。
	TestConfig(ctx context.Context, in SaveInput) (*ProbeResult, error)
	// SearchDirectory 按关键词检索目录用户。
	SearchDirectory(ctx context.Context, keyword string) ([]Entry, error)
	// Lookup 按账号批量查找目录用户。缺失账号不会报错，只是不出现在结果中。
	Lookup(ctx context.Context, usernames []string) ([]Entry, error)
	// BindUser 使用当前保存的配置对指定账号执行用户绑定。
	BindUser(ctx context.Context, username string, password string) error
}

var _ Service = (*serviceImpl)(nil)

type serviceImpl struct {
	directory Directory // 目录访问
}

// New 构造 LDAP 服务。directory 不得为空。
func New(directory Directory) (Service, error) {
	if directory == nil {
		return nil, gerror.New("ldap directory is required")
	}
	return &serviceImpl{directory: directory}, nil
}

func (c Config) timeout() time.Duration {
	sec := c.TimeoutSec
	if sec < 1 {
		sec = defaultTimeoutSec
	}
	if sec > maxTimeoutSec {
		sec = maxTimeoutSec
	}
	return time.Duration(sec) * time.Second
}
