// 本文件验证平台用户列表按所属团队筛选。

package user

import (
	"context"
	"testing"
	"time"

	"github.com/gogf/gf/v2/os/gctx"

	"github.com/gqcn/ltp/internal/dao"
	"github.com/gqcn/ltp/internal/model/do"
	"github.com/gqcn/ltp/internal/service/ldap"
	"github.com/gqcn/ltp/internal/service/role"
)

// TestUserListFiltersByTeam 验证按团队筛选命中成员、排除非成员，且省略 teamId 不收窄。
func TestUserListFiltersByTeam(t *testing.T) {
	var (
		prefix       = "tfe2e" + time.Now().Format("150405000")
		memberName   = prefix + "m"
		outsiderName = prefix + "o"
	)
	svc := newUserForTest(t, stubLDAP{entries: []ldap.Entry{
		{Username: memberName, Name: "筛组成员", Email: memberName + "@msxf.com", Department: "测试", Title: "工程师"},
		{Username: outsiderName, Name: "筛组外人", Email: outsiderName + "@msxf.com", Department: "测试", Title: "工程师"},
	}})
	ctx := gctx.New()
	added, err := svc.AddFromDirectory(ctx, []string{memberName, outsiderName}, role.CodeAlgo)
	if err != nil {
		t.Fatalf("add: %v", err)
	}
	if added != 2 {
		t.Fatalf("added=%d", added)
	}
	memberID := mustUserID(t, svc, memberName)
	outsiderID := mustUserID(t, svc, outsiderName)
	teamID, err := dao.SysTeam.Ctx(ctx).Data(do.SysTeam{
		Name:        "用户筛团队-" + prefix,
		Description: "list team filter",
		OwnerUserId: memberID,
	}).InsertAndGetId()
	if err != nil {
		t.Fatalf("insert team: %v", err)
	}
	if _, err := dao.SysTeamMember.Ctx(ctx).Data(do.SysTeamMember{TeamId: teamID, UserId: memberID}).Insert(); err != nil {
		t.Fatalf("insert member: %v", err)
	}
	emptyTeamID, err := dao.SysTeam.Ctx(ctx).Data(do.SysTeam{
		Name:        "用户筛空团队-" + prefix,
		Description: "list team filter empty",
		OwnerUserId: outsiderID,
	}).InsertAndGetId()
	if err != nil {
		t.Fatalf("insert empty team: %v", err)
	}
	t.Cleanup(func() {
		bg := context.Background()
		_, _ = dao.SysTeamMember.Ctx(bg).Where(do.SysTeamMember{TeamId: teamID}).Delete()
		_, _ = dao.SysTeam.Ctx(bg).Where(do.SysTeam{Id: teamID}).Delete()
		_, _ = dao.SysTeam.Ctx(bg).Where(do.SysTeam{Id: emptyTeamID}).Delete()
		_, _ = svc.Remove(bg, []int64{memberID, outsiderID}, 0)
	})

	filtered, err := svc.List(ctx, ListInput{PageNum: 1, PageSize: 20, Keyword: prefix, TeamID: teamID})
	if err != nil {
		t.Fatalf("list by team: %v", err)
	}
	if filtered.Total != 1 || len(filtered.List) != 1 || filtered.List[0].Username != memberName {
		t.Fatalf("team filter: %+v", filtered)
	}

	all, err := svc.List(ctx, ListInput{PageNum: 1, PageSize: 20, Keyword: prefix})
	if err != nil {
		t.Fatalf("list all: %v", err)
	}
	got := usernamesOf(all)
	if all.Total != 2 || !containsName(got, memberName) || !containsName(got, outsiderName) {
		t.Fatalf("omit teamId total=%d list=%v", all.Total, got)
	}

	empty, err := svc.List(ctx, ListInput{PageNum: 1, PageSize: 20, Keyword: prefix, TeamID: emptyTeamID})
	if err != nil {
		t.Fatalf("list empty team: %v", err)
	}
	if empty.Total != 0 || len(empty.List) != 0 {
		t.Fatalf("non-member team should be empty: %+v", empty)
	}
}

// mustUserID 返回指定账号的用户 ID。
func mustUserID(t *testing.T, svc Service, username string) int64 {
	t.Helper()
	ids := idsOf(t, svc, username)
	if len(ids) != 1 {
		t.Fatalf("user %s ids=%v", username, ids)
	}
	return ids[0]
}

// usernamesOf 收集列表中的账号。
func usernamesOf(out *ListOutput) []string {
	names := make([]string, 0, len(out.List))
	for _, item := range out.List {
		if item == nil {
			continue
		}
		names = append(names, item.Username)
	}
	return names
}

// containsName 判断账号是否出现在列表中。
func containsName(names []string, want string) bool {
	for _, name := range names {
		if name == want {
			return true
		}
	}
	return false
}
