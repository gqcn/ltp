// 本文件实现配置集创建、草稿、发布与归档。

package traincfg

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"regexp"
	"strings"
	"unicode/utf8"

	"github.com/gogf/gf/v2/errors/gerror"

	"github.com/gqcn/ltp/internal/dao"
	"github.com/gqcn/ltp/internal/model/do"
	"github.com/gqcn/ltp/internal/model/entity"
	"github.com/gqcn/ltp/pkg/bizerr"
	"github.com/gqcn/ltp/pkg/logger"
)

const (
	visTeam    = "team"
	visPrivate = "private"
	stActive   = "active"
	stArchived = "archived"
	fwMega     = "megatron"
	fwNemo     = "nemo"
	fwAccel    = "accelerate"
	fwCustom   = "custom"
)

var filePathRe = regexp.MustCompile(`^[A-Za-z0-9][A-Za-z0-9._/-]*$`)

// Create 创建配置集。
func (s *serviceImpl) Create(ctx context.Context, in WriteInput) (int64, error) {
	meta, files, err := s.prepareMeta(ctx, in, 0)
	if err != nil {
		return 0, err
	}
	id, err := dao.TrainConfigSet.Ctx(ctx).Data(do.TrainConfigSet{
		Name:          meta.name,
		DisplayName:   meta.displayName,
		TeamId:        meta.teamID,
		Framework:     meta.framework,
		Visibility:    meta.visibility,
		Status:        stActive,
		OwnerUserId:   in.Actor.UserID,
		OwnerUsername: in.Actor.Username,
		OwnerNickname: in.Actor.Nickname,
		Description:   meta.description,
		LatestVersion: 0,
	}).InsertAndGetId()
	if err != nil {
		return 0, gerror.Wrap(err, "insert config set")
	}
	if len(files) > 0 || strings.TrimSpace(in.Message) != "" {
		if err := s.upsertDraft(ctx, id, in.Actor, in.Message, files); err != nil {
			return 0, err
		}
	}
	logger.Infof(ctx, "created config set %d name=%s", id, meta.name)
	return id, nil
}

// SaveDraft 保存个人草稿。
func (s *serviceImpl) SaveDraft(ctx context.Context, id int64, in WriteInput) error {
	row, err := s.mustVisible(ctx, in.Actor, id)
	if err != nil {
		return err
	}
	in.TeamID = row.TeamId
	meta, files, err := s.prepareMeta(ctx, in, id)
	if err != nil {
		return err
	}
	if _, err := dao.TrainConfigSet.Ctx(ctx).Where(do.TrainConfigSet{Id: id}).Data(do.TrainConfigSet{
		DisplayName: meta.displayName,
		Framework:   meta.framework,
		Visibility:  meta.visibility,
		Description: meta.description,
	}).Update(); err != nil {
		return gerror.Wrap(err, "update config set meta")
	}
	return s.upsertDraft(ctx, id, in.Actor, in.Message, files)
}

// Publish 发布不可变版本。
func (s *serviceImpl) Publish(ctx context.Context, id int64, in WriteInput) (int, error) {
	row, err := s.mustVisible(ctx, in.Actor, id)
	if err != nil {
		return 0, err
	}
	in.TeamID = row.TeamId
	meta, files, err := s.prepareMeta(ctx, in, id)
	if err != nil {
		return 0, err
	}
	if len(files) == 0 {
		return 0, errInvalid("至少需要一个文件")
	}
	if strings.TrimSpace(in.Message) == "" {
		return 0, errInvalid("发布时必须填写版本说明")
	}
	if in.BaseVersion != row.LatestVersion {
		return 0, bizerr.New(CodeConflict, bizerr.P("message", "版本冲突：最新已变化，请重新加载后再发布"))
	}
	next := row.LatestVersion + 1
	raw, err := encodeFiles(files)
	if err != nil {
		return 0, err
	}
	if _, err := dao.TrainConfigVersion.Ctx(ctx).Data(do.TrainConfigVersion{
		SetId:          id,
		Version:        next,
		Message:        strings.TrimSpace(in.Message),
		AuthorUserId:   in.Actor.UserID,
		AuthorUsername: in.Actor.Username,
		AuthorNickname: in.Actor.Nickname,
		Digest:         digestOf(raw),
		Files:          raw,
	}).Insert(); err != nil {
		return 0, gerror.Wrap(err, "insert config version")
	}
	if _, err := dao.TrainConfigSet.Ctx(ctx).Where(do.TrainConfigSet{Id: id}).Data(do.TrainConfigSet{
		DisplayName:   meta.displayName,
		Framework:     meta.framework,
		Visibility:    meta.visibility,
		Description:   meta.description,
		LatestVersion: next,
	}).Update(); err != nil {
		return 0, gerror.Wrap(err, "update config latest version")
	}
	if _, err := dao.TrainConfigDraft.Ctx(ctx).Where(do.TrainConfigDraft{SetId: id}).Delete(); err != nil {
		return 0, gerror.Wrap(err, "clear config draft")
	}
	logger.Infof(ctx, "published config set %d v%d", id, next)
	return next, nil
}

// UpdateStatus 归档或恢复。
func (s *serviceImpl) UpdateStatus(ctx context.Context, actor Actor, id int64, status string) error {
	if _, err := s.mustVisible(ctx, actor, id); err != nil {
		return err
	}
	st := strings.TrimSpace(status)
	if st != stActive && st != stArchived {
		return errInvalid("请选择状态")
	}
	if _, err := dao.TrainConfigSet.Ctx(ctx).Where(do.TrainConfigSet{Id: id}).Data(do.TrainConfigSet{Status: st}).Update(); err != nil {
		return gerror.Wrap(err, "update config status")
	}
	return nil
}

type preparedMeta struct {
	name        string
	displayName string
	teamID      int64
	framework   string
	visibility  string
	description string
}

func (s *serviceImpl) prepareMeta(ctx context.Context, in WriteInput, exceptID int64) (*preparedMeta, []File, error) {
	display := strings.TrimSpace(in.DisplayName)
	if display == "" {
		return nil, nil, errInvalid("请填写显示名称")
	}
	if utf8.RuneCountInString(display) > 64 {
		return nil, nil, errInvalid("最长 64 个字符")
	}
	fw, ok := parseFramework(in.Framework)
	if !ok {
		return nil, nil, errInvalid("请选择框架")
	}
	vis, ok := parseVisibility(in.Visibility)
	if !ok {
		return nil, nil, errInvalid("请选择可见性")
	}
	if in.TeamID <= 0 {
		return nil, nil, errInvalid("请选择所属团队")
	}
	if !in.Actor.IsAdmin {
		ids, err := s.teamSvc.ListIDsByUserID(ctx, in.Actor.UserID)
		if err != nil {
			return nil, nil, err
		}
		if !containsID(ids, in.TeamID) {
			return nil, nil, errInvalid("只能使用自己加入的团队")
		}
	}
	names, err := s.teamSvc.MapByIDs(ctx, []int64{in.TeamID})
	if err != nil {
		return nil, nil, err
	}
	if _, ok := names[in.TeamID]; !ok {
		return nil, nil, errInvalid("请选择所属团队")
	}
	exists, err := dao.TrainConfigSet.Ctx(ctx).
		Where(do.TrainConfigSet{TeamId: in.TeamID, DisplayName: display}).
		WhereNot(dao.TrainConfigSet.Columns().Id, exceptID).
		Count()
	if err != nil {
		return nil, nil, gerror.Wrap(err, "check config display name")
	}
	if exists > 0 {
		return nil, nil, bizerr.New(CodeNameExists)
	}
	files, err := normalizeFiles(in.Files)
	if err != nil {
		return nil, nil, err
	}
	name := slugConfig(display)
	if exceptID == 0 {
		name, err = s.uniqueName(ctx, in.TeamID, name)
		if err != nil {
			return nil, nil, err
		}
	} else {
		var row *entity.TrainConfigSet
		if err := dao.TrainConfigSet.Ctx(ctx).Where(do.TrainConfigSet{Id: exceptID}).Scan(&row); err != nil {
			return nil, nil, gerror.Wrap(err, "get config name")
		}
		if row != nil {
			name = row.Name
		}
	}
	return &preparedMeta{
		name:        name,
		displayName: display,
		teamID:      in.TeamID,
		framework:   fw,
		visibility:  vis,
		description: strings.TrimSpace(in.Description),
	}, files, nil
}

func (s *serviceImpl) uniqueName(ctx context.Context, teamID int64, base string) (string, error) {
	name := base
	for i := 2; i < 50; i++ {
		n, err := dao.TrainConfigSet.Ctx(ctx).Where(do.TrainConfigSet{TeamId: teamID, Name: name}).Count()
		if err != nil {
			return "", gerror.Wrap(err, "check config name")
		}
		if n == 0 {
			return name, nil
		}
		name = base + "-" + itoa(i)
	}
	return "", errInvalid("无法生成唯一配置标识")
}

func (s *serviceImpl) upsertDraft(ctx context.Context, setID int64, actor Actor, message string, files []File) error {
	raw, err := encodeFiles(files)
	if err != nil {
		return err
	}
	var row *entity.TrainConfigDraft
	if err := dao.TrainConfigDraft.Ctx(ctx).Where(do.TrainConfigDraft{SetId: setID}).Scan(&row); err != nil {
		return gerror.Wrap(err, "get config draft")
	}
	data := do.TrainConfigDraft{
		SetId:         setID,
		OwnerUserId:   actor.UserID,
		OwnerUsername: actor.Username,
		OwnerNickname: actor.Nickname,
		Message:       strings.TrimSpace(message),
		Files:         raw,
	}
	if row == nil {
		_, err = dao.TrainConfigDraft.Ctx(ctx).Data(data).Insert()
		if err != nil {
			return gerror.Wrap(err, "insert config draft")
		}
		return nil
	}
	_, err = dao.TrainConfigDraft.Ctx(ctx).Where(do.TrainConfigDraft{Id: row.Id}).Data(data).Update()
	if err != nil {
		return gerror.Wrap(err, "update config draft")
	}
	return nil
}

func (s *serviceImpl) mustVisible(ctx context.Context, actor Actor, id int64) (*entity.TrainConfigSet, error) {
	var row *entity.TrainConfigSet
	if err := dao.TrainConfigSet.Ctx(ctx).Where(do.TrainConfigSet{Id: id}).Scan(&row); err != nil {
		return nil, gerror.Wrap(err, "get config set")
	}
	if row == nil {
		return nil, bizerr.New(CodeNotFound)
	}
	if actor.seesAllTeams() {
		return row, nil
	}
	if row.Visibility == visPrivate && row.OwnerUserId != actor.UserID {
		return nil, bizerr.New(CodeNotFound)
	}
	ids, err := s.teamSvc.ListIDsByUserID(ctx, actor.UserID)
	if err != nil {
		return nil, err
	}
	if !containsID(ids, row.TeamId) {
		return nil, bizerr.New(CodeNotFound)
	}
	return row, nil
}

func normalizeFiles(in []File) ([]File, error) {
	if len(in) > maxFiles {
		return nil, errInvalid("单个配置集最多 40 个文件")
	}
	seen := map[string]struct{}{}
	out := make([]File, 0, len(in))
	for _, f := range in {
		path := strings.TrimSpace(strings.TrimLeft(f.Path, "/"))
		if path == "" {
			return nil, errInvalid("请填写文件路径")
		}
		if len(path) > maxFilePath {
			return nil, errInvalid("文件路径最长 128 个字符")
		}
		if strings.Contains(path, "..") || !filePathRe.MatchString(path) {
			return nil, errInvalid("路径仅允许字母数字、._- 与 /")
		}
		if _, ok := seen[path]; ok {
			return nil, errInvalid("文件路径重复：" + path)
		}
		seen[path] = struct{}{}
		if len([]byte(f.Content)) > maxFileBytes {
			return nil, errInvalid(path + " 超过 50 KB")
		}
		out = append(out, File{Path: path, Content: f.Content})
	}
	return out, nil
}

func encodeFiles(files []File) (string, error) {
	if files == nil {
		files = []File{}
	}
	raw, err := json.Marshal(files)
	if err != nil {
		return "", gerror.Wrap(err, "marshal config files")
	}
	return string(raw), nil
}

func digestOf(raw string) string {
	sum := sha256.Sum256([]byte(raw))
	return hex.EncodeToString(sum[:])[:16]
}

func slugConfig(display string) string {
	var b strings.Builder
	for _, r := range strings.ToLower(strings.TrimSpace(display)) {
		switch {
		case r >= 'a' && r <= 'z', r >= '0' && r <= '9':
			b.WriteRune(r)
		case r == ' ' || r == '_' || r == '-' || r == '.':
			if b.Len() > 0 {
				b.WriteByte('-')
			}
		}
	}
	name := strings.Trim(b.String(), "-")
	for strings.Contains(name, "--") {
		name = strings.ReplaceAll(name, "--", "-")
	}
	if name == "" {
		name = "cfg"
	}
	if len(name) > 48 {
		name = name[:48]
	}
	return name
}

func parseFramework(raw string) (string, bool) {
	switch strings.TrimSpace(raw) {
	case fwMega, fwNemo, fwAccel, fwCustom:
		return strings.TrimSpace(raw), true
	default:
		return "", false
	}
}

func parseVisibility(raw string) (string, bool) {
	switch strings.TrimSpace(raw) {
	case visTeam, visPrivate:
		return strings.TrimSpace(raw), true
	default:
		return "", false
	}
}

func containsID(ids []int64, want int64) bool {
	for _, id := range ids {
		if id == want {
			return true
		}
	}
	return false
}

func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	var digits [8]byte
	i := len(digits)
	for n > 0 {
		i--
		digits[i] = byte('0' + n%10)
		n /= 10
	}
	return string(digits[i:])
}
