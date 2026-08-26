#!/usr/bin/env bash
# 由仓库根目录 `make status` 调用。输出格式对齐 linapro-site 的 ASCII 状态表。

set -u

ROOT_DIR="${ROOT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"
BACKEND_PID_FILE="${BACKEND_PID:-$ROOT_DIR/temp/pids/backend.pid}"
FRONTEND_PID_FILE="${FRONTEND_PID:-$ROOT_DIR/temp/pids/frontend.pid}"
BACKEND_LOG="${BACKEND_LOG:-$ROOT_DIR/temp/backend.log}"
FRONTEND_LOG="${FRONTEND_LOG:-$ROOT_DIR/temp/frontend.log}"
BACKEND_PORT="${BACKEND_PORT:-8000}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"
PGHOST="${PGHOST:-127.0.0.1}"
PGPORT="${PGPORT:-5432}"
PGUSER="${PGUSER:-postgres}"
PGDATABASE="${PGDATABASE:-ltp}"
PSQL="${PSQL:-}"
COMPOSE_FILE="${COMPOSE_FILE:-$ROOT_DIR/hack/deploy/docker-compose.yml}"
LDAP_HOST="${LDAP_HOST:-127.0.0.1}"
LDAP_PORT="${LDAP_PORT:-1389}"

# 表头宽度下限，与 linapro-site PrintStatusTable 列一致。
widths=(5 6 3 3 8 8)
rows=()

C_RST=""
C_RUN=""
C_STOP=""
C_WAIT=""
C_ERR=""
if [ -t 1 ]; then
	C_RST=$'\033[0m'
	C_RUN=$'\033[32m'
	C_STOP=$'\033[90m'
	C_WAIT=$'\033[33m'
	C_ERR=$'\033[31m'
fi

relpath() {
	local p="$1"
	case "$p" in
	"$ROOT_DIR"/*) printf '%s\n' "${p#"$ROOT_DIR"/}" ;;
	*) printf '%s\n' "$p" ;;
	esac
}

or_dash() {
	if [ -n "${1:-}" ]; then
		printf '%s\n' "$1"
	else
		printf '%s\n' "-"
	fi
}

read_pidfile() {
	local file="$1"
	if [ ! -f "$file" ]; then
		return 0
	fi
	tr -d '[:space:]' <"$file"
}

pid_alive() {
	local pid="${1:-}"
	[ -n "$pid" ] && kill -0 "$pid" 2>/dev/null
}

listen_pid() {
	local port="$1"
	if ! command -v lsof >/dev/null 2>&1; then
		return 0
	fi
	lsof -nP -iTCP:"$port" -sTCP:LISTEN -t 2>/dev/null | awk 'NR==1 {print; exit}'
}

port_open() {
	local host="$1" port="$2"
	local pid
	pid="$(listen_pid "$port")"
	if [ -n "$pid" ]; then
		return 0
	fi
	bash -c "echo >/dev/tcp/${host}/${port}" >/dev/null 2>&1
}

http_code() {
	local url="$1" code
	if ! command -v curl >/dev/null 2>&1; then
		echo "000"
		return 0
	fi
	code="$(curl -sS -o /dev/null -w '%{http_code}' --connect-timeout 1 --max-time 2 "$url" 2>/dev/null || true)"
	if [ -z "$code" ]; then
		code="000"
	fi
	echo "$code"
}

add_row() {
	local cell n i=0
	rows+=("$1"$'\t'"$2"$'\t'"$3"$'\t'"$4"$'\t'"$5"$'\t'"$6")
	for cell in "$1" "$2" "$3" "$4" "$5" "$6"; do
		n=${#cell}
		if [ "$n" -gt "${widths[$i]}" ]; then
			widths[$i]=$n
		fi
		i=$((i + 1))
	done
}

print_border() {
	local w
	printf '+'
	for w in "${widths[@]}"; do
		printf '%s+' "$(printf '%*s' "$((w + 2))" '' | tr ' ' '-')"
	done
	printf '\n'
}

status_color() {
	case "$1" in
	running) printf '%s' "$C_RUN" ;;
	stopped) printf '%s' "$C_STOP" ;;
	starting | unknown) printf '%s' "$C_WAIT" ;;
	error) printf '%s' "$C_ERR" ;;
	esac
}

print_cells() {
	local colorize="$1" i=0 val color
	shift
	printf '|'
	for val in "$@"; do
		if [ "$colorize" = "1" ] && [ "$i" -eq 1 ]; then
			color="$(status_color "$val")"
			printf ' %s%-*s%s |' "$color" "${widths[$i]}" "$val" "$C_RST"
		else
			printf ' %-*s |' "${widths[$i]}" "$val"
		fi
		i=$((i + 1))
	done
	printf '\n'
}

print_table() {
	local row
	print_border
	print_cells 0 "Entry" "Status" "URL" "PID" "PID File" "Log File"
	print_border
	for row in "${rows[@]}"; do
		IFS=$'\t' read -r c1 c2 c3 c4 c5 c6 <<EOF
$row
EOF
		print_cells 1 "$c1" "$c2" "$c3" "$c4" "$c5" "$c6"
	done
	print_border
}

pid_cell() {
	if [ -n "${1:-}" ]; then
		printf '%s\n' "$1"
	elif [ -n "${2:-}" ]; then
		printf '%s\n' "$2"
	else
		printf '%s\n' "-"
	fi
}

check_http_app() {
	local name="$1" pidfile="$2" logfile="$3" port="$4" public_url="$5" probe_url="$6"
	local running_pid file_pid code status
	running_pid="$(listen_pid "$port")"
	file_pid="$(read_pidfile "$pidfile")"
	code="$(http_code "$probe_url")"

	if [ "$code" = "200" ]; then
		status="running"
	elif port_open "127.0.0.1" "$port"; then
		if pid_alive "$file_pid" || [ -n "$running_pid" ]; then
			status="starting"
		else
			status="error"
		fi
	elif pid_alive "$file_pid"; then
		status="error"
	else
		status="stopped"
	fi

	add_row "$name" "$status" "$public_url" "$(pid_cell "$running_pid" "$file_pid")" "$(relpath "$pidfile")" "$(relpath "$logfile")"
}

check_postgres() {
	local status pid psql_bin rc
	pid="$(listen_pid "$PGPORT")"
	psql_bin="$PSQL"
	if [ -z "$psql_bin" ]; then
		psql_bin="$(command -v psql 2>/dev/null || true)"
	fi

	if [ -n "$psql_bin" ]; then
		"$psql_bin" -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d postgres -c 'SELECT 1' >/dev/null 2>&1
		rc=$?
		if [ "$rc" -eq 0 ]; then
			if "$psql_bin" -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d postgres -tc "SELECT 1 FROM pg_database WHERE datname='${PGDATABASE}'" 2>/dev/null | grep -q 1; then
				status="running"
			else
				status="error"
			fi
		elif port_open "$PGHOST" "$PGPORT"; then
			status="error"
		else
			status="stopped"
		fi
	elif port_open "$PGHOST" "$PGPORT"; then
		status="unknown"
	else
		status="stopped"
	fi
	add_row "PostgreSQL" "$status" "postgres://${PGHOST}:${PGPORT}/${PGDATABASE}" "$(or_dash "$pid")" "-" "-"
}

compose_field() {
	local service="$1"
	if ! command -v docker >/dev/null 2>&1; then
		return 0
	fi
	docker compose -f "$COMPOSE_FILE" ps --format '{{.State}}|{{.Health}}' "$service" 2>/dev/null | awk 'NR==1 {print; exit}'
}

check_ldap() {
	local status pid state health compose
	pid="$(listen_pid "$LDAP_PORT")"
	compose="$(compose_field ldap)"
	state="${compose%%|*}"
	if [ "$compose" = "$state" ]; then
		health=""
	else
		health="${compose#*|}"
	fi

	if [ "$state" = "running" ]; then
		if port_open "$LDAP_HOST" "$LDAP_PORT"; then
			if [ "$health" = "healthy" ] || [ -z "$health" ]; then
				status="running"
			else
				status="starting"
			fi
		else
			status="error"
		fi
	elif port_open "$LDAP_HOST" "$LDAP_PORT"; then
		status="running"
	else
		status="stopped"
	fi
	add_row "LDAP" "$status" "ldap://${LDAP_HOST}:${LDAP_PORT}" "$(or_dash "$pid")" "-" "-"
}

check_compose_postgres() {
	local compose state pid
	compose="$(compose_field postgres)"
	[ -n "$compose" ] || return 0
	state="${compose%%|*}"
	[ "$state" = "running" ] || return 0
	pid="$(listen_pid 5433)"
	add_row "Compose PostgreSQL" "running" "postgres://127.0.0.1:5433/ltp" "$(or_dash "$pid")" "-" "-"
}

check_http_app "Backend" "$BACKEND_PID_FILE" "$BACKEND_LOG" "$BACKEND_PORT" \
	"http://127.0.0.1:${BACKEND_PORT}/" "http://127.0.0.1:${BACKEND_PORT}/api/health"
check_http_app "Frontend" "$FRONTEND_PID_FILE" "$FRONTEND_LOG" "$FRONTEND_PORT" \
	"http://127.0.0.1:${FRONTEND_PORT}/" "http://127.0.0.1:${FRONTEND_PORT}/"
check_postgres
check_ldap
check_compose_postgres

print_table
