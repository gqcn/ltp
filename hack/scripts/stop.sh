#!/usr/bin/env bash
# 由仓库根目录 `make stop` 调用。停掉后端与前端，包括 pid 文件过期后仍占端口的残留进程。

set -u

ROOT_DIR="${ROOT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"
BACKEND_PID_FILE="${BACKEND_PID:-$ROOT_DIR/temp/pids/backend.pid}"
FRONTEND_PID_FILE="${FRONTEND_PID:-$ROOT_DIR/temp/pids/frontend.pid}"
BACKEND_PORT="${BACKEND_PORT:-8000}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"

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

listen_pids() {
	local port="$1"
	if ! command -v lsof >/dev/null 2>&1; then
		return 0
	fi
	lsof -nP -iTCP:"$port" -sTCP:LISTEN -t 2>/dev/null | sort -u
}

# 先杀子进程再杀自身，避免 pnpm/vite 留下孤儿。
kill_tree() {
	local pid="${1:-}" child
	if ! pid_alive "$pid"; then
		return 0
	fi
	for child in $(pgrep -P "$pid" 2>/dev/null || true); do
		kill_tree "$child"
	done
	kill "$pid" 2>/dev/null || true
}

wait_dead() {
	local pid="${1:-}" _i
	if [ -z "$pid" ]; then
		return 0
	fi
	_i=0
	while [ "$_i" -lt 20 ]; do
		pid_alive "$pid" || return 0
		sleep 0.1
		_i=$((_i + 1))
	done
	kill -9 "$pid" 2>/dev/null || true
}

# 从监听进程向上找到 pnpm/node 包装进程，避免只杀掉 vite 而留下 pnpm。
service_root_pid() {
	local pid="${1:-}" ppid cmd
	if [ -z "$pid" ]; then
		return 0
	fi
	while :; do
		ppid="$(ps -o ppid= -p "$pid" 2>/dev/null | tr -d '[:space:]')"
		if [ -z "$ppid" ] || [ "$ppid" = "0" ] || [ "$ppid" = "1" ]; then
			break
		fi
		cmd="$(ps -o command= -p "$ppid" 2>/dev/null || true)"
		case "$cmd" in
		*pnpm* | *npm* | *vite* | *node* | *temp/bin/ltp*) pid="$ppid" ;;
		*) break ;;
		esac
	done
	printf '%s\n' "$pid"
}

stop_pidfile() {
	local pidfile="$1" pid
	pid="$(read_pidfile "$pidfile")"
	if pid_alive "$pid"; then
		kill_tree "$pid"
		wait_dead "$pid"
	fi
	rm -f "$pidfile"
}

stop_port() {
	local port="$1" pid root
	for pid in $(listen_pids "$port"); do
		root="$(service_root_pid "$pid")"
		kill_tree "$root"
		wait_dead "$root"
		wait_dead "$pid"
	done
	for pid in $(listen_pids "$port"); do
		kill -9 "$pid" 2>/dev/null || true
	done
}

wait_port_free() {
	local port="$1" _i=0
	while [ "$_i" -lt 20 ]; do
		if [ -z "$(listen_pids "$port")" ]; then
			return 0
		fi
		sleep 0.1
		_i=$((_i + 1))
	done
}

stop_pidfile "$BACKEND_PID_FILE"
stop_pidfile "$FRONTEND_PID_FILE"
stop_port "$BACKEND_PORT"
stop_port "$FRONTEND_PORT"
wait_port_free "$BACKEND_PORT"
wait_port_free "$FRONTEND_PORT"

echo "已停止后端（:${BACKEND_PORT}）与前端（:${FRONTEND_PORT}）。"
echo "PostgreSQL 与 LDAP 不由 make stop 管理；停止 LDAP 请用 make ldap.down。"
