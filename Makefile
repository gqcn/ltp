ROOT_DIR      := $(shell pwd)
BACKEND_DIR   := apps/backend
FRONTEND_DIR  := apps/frontend
E2E_DIR       := hack/tests
PGHOST        ?= 127.0.0.1
PGPORT        ?= 5432
PGUSER        ?= postgres
PGDATABASE    ?= ltp
PSQL          ?= $(or $(shell command -v psql 2>/dev/null),$(wildcard /Applications/Postgres.app/Contents/Versions/latest/bin/psql),$(wildcard /Applications/Postgres.app/Contents/Versions/18/bin/psql))
TEMP_DIR      := $(ROOT_DIR)/temp
PID_DIR       := $(TEMP_DIR)/pids
BACKEND_BIN   := $(TEMP_DIR)/bin/ltp
BACKEND_LOG   := $(TEMP_DIR)/backend.log
FRONTEND_LOG  := $(TEMP_DIR)/frontend.log
BACKEND_PID   := $(PID_DIR)/backend.pid
FRONTEND_PID  := $(PID_DIR)/frontend.pid
BACKEND_PORT  := 8000
FRONTEND_PORT := 5173

include hack/makefiles/help.mk
include hack/makefiles/database.mk
include hack/makefiles/dev.mk
include hack/makefiles/lint.mk
include hack/makefiles/test.mk
