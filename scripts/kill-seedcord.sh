#!/usr/bin/env bash
set -euo pipefail

# Kill or list Node/PNPM processes started from this repository and free common ports
# Defaults: kill processes and free ports 3000,6956. Use -l to only list.

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEFAULT_PORTS=("3000" "6956")

LIST_ONLY=false
KILL_PORTS=true
PORTS=("${DEFAULT_PORTS[@]}")

usage() {
  cat <<EOF
Usage: $(basename "$0") [options]

Options:
  -l, --list            Only list matching processes; do not kill
  --no-ports            Do not attempt to free ports
  -p, --ports PORTS     Comma-separated list of ports to free (default: 3000,6956)
  -h, --help            Show this help

Behavior:
  - Targets processes whose command contains either the repository path or "@seedcord"
  - Sends SIGTERM first; if still running, escalates to SIGKILL
  - When enabled, frees the specified ports using lsof
EOF
}

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      -l|--list)
        LIST_ONLY=true
        shift
        ;;
      --no-ports)
        KILL_PORTS=false
        shift
        ;;
      -p|--ports)
        shift
        IFS=',' read -r -a PORTS <<< "${1:-}"
        shift || true
        ;;
      -h|--help)
        usage
        exit 0
        ;;
      *)
        echo "Unknown option: $1" >&2
        usage
        exit 1
        ;;
    esac
  done
}

list_repo_procs() {
  # List processes associated with the repo path or @seedcord packages
  (pgrep -fal "$REPO_ROOT" || true)
  (pgrep -fal "@seedcord" || true)
  # Fallback: ps filter
  ps aux | grep -iE "node|pnpm" | grep -E "$REPO_ROOT|@seedcord" | grep -v grep || true
}

kill_repo_procs() {
  echo "Terminating repo-related processes (SIGTERM)..."
  pkill -f "$REPO_ROOT" 2>/dev/null || true
  pkill -f "@seedcord" 2>/dev/null || true
  sleep 1
  # Escalate if any remain
  if pgrep -f "$REPO_ROOT" >/dev/null 2>&1 || pgrep -f "@seedcord" >/dev/null 2>&1; then
    echo "Some processes still running. Escalating to SIGKILL..."
    pkill -9 -f "$REPO_ROOT" 2>/dev/null || true
    pkill -9 -f "@seedcord" 2>/dev/null || true
  fi
}

free_ports() {
  for port in "${PORTS[@]}"; do
    [[ -z "$port" ]] && continue
    # Find PIDs listening on port and terminate
    if pids=$(lsof -ti tcp:"$port" 2>/dev/null); then
      if [[ -n "$pids" ]]; then
        echo "Freeing TCP port $port (SIGTERM)..."
        # shellcheck disable=SC2086
        kill -15 $pids 2>/dev/null || true
        sleep 1
        if pids2=$(lsof -ti tcp:"$port" 2>/dev/null) && [[ -n "$pids2" ]]; then
          echo "Port $port still in use. Forcing termination (SIGKILL)..."
          # shellcheck disable=SC2086
          kill -9 $pids2 2>/dev/null || true
        fi
      fi
    fi
  done
}

main() {
  parse_args "$@"

  echo "Repository root: $REPO_ROOT"
  echo "--- Matching processes ---"
  list_repo_procs

  if $LIST_ONLY; then
    exit 0
  fi

  kill_repo_procs

  if $KILL_PORTS; then
    echo "--- Freeing ports: ${PORTS[*]} ---"
    free_ports
  fi

  echo "--- Remaining matching processes (after cleanup) ---"
  list_repo_procs
}

main "$@"
