// 本文件对配置的 PostgreSQL 执行幂等 SQL 文件。

package cmd

import (
	"context"
	"os"
	"path/filepath"
	"strings"
	"unicode"

	"github.com/gogf/gf/v2/database/gdb"
	"github.com/gogf/gf/v2/errors/gerror"
	"github.com/gogf/gf/v2/frame/g"
	"github.com/gogf/gf/v2/os/gfile"

	"github.com/gqcn/ltp/pkg/logger"
)

func execSQLDir(ctx context.Context, dir string) error {
	if !gfile.Exists(dir) {
		return gerror.Newf("sql directory does not exist: %s", dir)
	}
	entries, err := os.ReadDir(dir)
	if err != nil {
		return gerror.Wrapf(err, "read sql directory %s", dir)
	}
	db := g.DB()
	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".sql") {
			continue
		}
		path := filepath.Join(dir, entry.Name())
		logger.Infof(ctx, "executing SQL file %s", path)
		if err := execSQLFile(ctx, db, path); err != nil {
			return err
		}
	}
	return nil
}

func execSQLFile(ctx context.Context, db gdb.DB, path string) error {
	raw, err := os.ReadFile(path)
	if err != nil {
		return gerror.Wrapf(err, "read sql file %s", path)
	}
	for _, stmt := range splitSQL(string(raw)) {
		if _, err := db.Exec(ctx, stmt); err != nil {
			return gerror.Wrapf(err, "execute sql in %s: %s", path, clipSQL(stmt))
		}
	}
	return nil
}

func splitSQL(raw string) []string {
	var (
		stmts   []string
		builder strings.Builder
	)
	for _, line := range strings.Split(raw, "\n") {
		trimmed := strings.TrimSpace(line)
		if strings.HasPrefix(trimmed, "--") {
			continue
		}
		builder.WriteString(line)
		builder.WriteByte('\n')
	}
	for _, stmt := range strings.Split(builder.String(), ";") {
		stmt = strings.TrimSpace(stmt)
		stmt = strings.TrimRightFunc(stmt, unicode.IsSpace)
		if stmt == "" {
			continue
		}
		stmts = append(stmts, stmt)
	}
	return stmts
}

func clipSQL(stmt string) string {
	stmt = strings.Join(strings.Fields(stmt), " ")
	if len(stmt) > 120 {
		return stmt[:120] + "..."
	}
	return stmt
}
