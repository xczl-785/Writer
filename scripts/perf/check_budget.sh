#!/usr/bin/env bash
set -euo pipefail

if [ "${1:-}" = "" ]; then
  echo "Usage: bash scripts/perf/check_budget.sh <metrics.csv>"
  exit 1
fi

METRICS_FILE="$1"
if [ ! -f "$METRICS_FILE" ]; then
  echo "ERROR: metrics file not found: $METRICS_FILE"
  exit 1
fi

tmp_file="$(mktemp)"
trap 'rm -f "$tmp_file"' EXIT

# Normalize CRLF and remove empty lines.
sed 's/\r$//' "$METRICS_FILE" | awk 'NF > 0' > "$tmp_file"

get_value() {
  local key="$1"
  awk -F',' -v k="$key" '
    BEGIN { found=0 }
    NR == 1 { next } # header
    $1 == k { print $2; found=1; exit }
    END { if (found == 0) exit 1 }
  ' "$tmp_file"
}

num_leq() {
  local actual="$1"
  local limit="$2"
  awk -v a="$actual" -v b="$limit" 'BEGIN { exit (a+0 <= b+0) ? 0 : 1 }'
}

num_eq() {
  local actual="$1"
  local expected="$2"
  awk -v a="$actual" -v b="$expected" 'BEGIN { exit (a+0 == b+0) ? 0 : 1 }'
}

failures=0

check_required() {
  local key="$1"
  if ! get_value "$key" >/dev/null 2>&1; then
    echo "FAIL: missing metric '$key'"
    failures=$((failures + 1))
  fi
}

for metric in \
  cold_start_ttc_p95_ms \
  hot_start_ttc_p95_ms \
  input_latency_p95_ms \
  input_dropped_chars \
  atomic_write_integrity_pass
do
  check_required "$metric"
done

if [ "$failures" -ne 0 ]; then
  echo "Budget check failed: missing required metrics"
  exit 1
fi

cold_p95="$(get_value cold_start_ttc_p95_ms)"
hot_p95="$(get_value hot_start_ttc_p95_ms)"
input_p95="$(get_value input_latency_p95_ms)"
dropped="$(get_value input_dropped_chars)"
atomic_ok="$(get_value atomic_write_integrity_pass)"

if ! num_leq "$cold_p95" "1800"; then
  echo "FAIL: cold_start_ttc_p95_ms=$cold_p95 exceeds 1800"
  failures=$((failures + 1))
fi

if ! num_leq "$hot_p95" "900"; then
  echo "FAIL: hot_start_ttc_p95_ms=$hot_p95 exceeds 900"
  failures=$((failures + 1))
fi

if ! num_leq "$input_p95" "33"; then
  echo "FAIL: input_latency_p95_ms=$input_p95 exceeds 33"
  failures=$((failures + 1))
fi

if ! num_eq "$dropped" "0"; then
  echo "FAIL: input_dropped_chars=$dropped expected 0"
  failures=$((failures + 1))
fi

if [ "$atomic_ok" != "true" ]; then
  echo "FAIL: atomic_write_integrity_pass=$atomic_ok expected true"
  failures=$((failures + 1))
fi

if [ "$failures" -ne 0 ]; then
  echo "Budget check: FAILED ($failures issue(s))"
  exit 1
fi

echo "Budget check: PASSED"
