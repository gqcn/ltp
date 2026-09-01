// 本文件验证配置集列表按团队成员过滤，管理员与 SRE 可看全部。

package traincfg

import (
	"context"
	"os"
	"testing"
	"time"

	"github.com/gogf/gf/v2/database/gdb"
	"github.com/gogf/gf/v2/os/gctx"

	"github.com/gqcn/ltp/internal/dao"
	"github.com/gqcn/ltp/internal/model/do"
	"github.com/gqcn/ltp/internal/model/entity"
	"github.com/gqcn/ltp/internal/service/team"
	"github.com/gqcn/ltp/pkg/bizerr"
)

type listTeamStub struct {
	team.Service
	ids []int64
}

func (s listTeamStub) ListIDsByUserID(ctx context.Context, userID int64) ([]int64, error) {
	_ = ctx
	_ = userID
	return s.ids, nil
}

func TestListConfigsTeamScope(t *testing.T) {
	if os.Getenv("LTP_SKIP_DB_TEST") == "1" {
		t.Skip("database tests skipped")
	}
	if err := os.Chdir(findRepoRoot(t)); err != nil {
		t.Fatal(err)
	}
	ctx := gctx.New()
	stamp := time.Now().UnixNano()
	mineTeam := stamp + 1
	otherTeam := stamp + 2
	mineID := insertScopeConfig(t, ctx, mineTeam, "cfg-mine-"+time.Now().Format("150405.000"), 21)
	otherID := insertScopeConfig(t, ctx, otherTeam, "cfg-other-"+time.Now().Format("150405.000"), 22)
	svc := &serviceImpl{teamSvc: listTeamStub{ids: []int64{mineTeam}}}

	member, err := svc.listModel(ctx, ListInput{Actor: Actor{UserID: 21}})
	if err != nil {
		t.Fatal(err)
	}
	assertConfigIDs(t, member, []int64{mineID}, []int64{otherID})

	sre, err := svc.listModel(ctx, ListInput{Actor: Actor{UserID: 99, SeeAll: true}})
	if err != nil {
		t.Fatal(err)
	}
	assertConfigIDs(t, sre, []int64{mineID, otherID}, nil)

	if _, err := svc.mustVisible(ctx, Actor{UserID: 21}, otherID); !bizerr.Is(err, CodeNotFound) {
		t.Fatalf("member should not see other team config: %v", err)
	}
	if _, err := svc.mustVisible(ctx, Actor{UserID: 99, SeeAll: true}, otherID); err != nil {
		t.Fatalf("sre should see other team config: %v", err)
	}
}

func insertScopeConfig(t *testing.T, ctx context.Context, teamID int64, name string, ownerID int64) int64 {
	t.Helper()
	id, err := dao.TrainConfigSet.Ctx(ctx).Data(do.TrainConfigSet{
		Name:          name,
		DisplayName:   name,
		TeamId:        teamID,
		Framework:     fwMega,
		Visibility:    visTeam,
		Status:        stActive,
		OwnerUserId:   ownerID,
		OwnerUsername: "owner",
		OwnerNickname: "owner",
	}).InsertAndGetId()
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		_, _ = dao.TrainConfigSet.Ctx(context.Background()).Where(do.TrainConfigSet{Id: id}).Delete()
	})
	return id
}

func assertConfigIDs(t *testing.T, mod *gdb.Model, want, hide []int64) {
	t.Helper()
	var rows []*entity.TrainConfigSet
	if err := mod.Scan(&rows); err != nil {
		t.Fatal(err)
	}
	seen := map[int64]bool{}
	for _, row := range rows {
		if row != nil {
			seen[row.Id] = true
		}
	}
	for _, id := range want {
		if !seen[id] {
			t.Fatalf("missing config %d", id)
		}
	}
	for _, id := range hide {
		if seen[id] {
			t.Fatalf("unexpected config %d", id)
		}
	}
}
