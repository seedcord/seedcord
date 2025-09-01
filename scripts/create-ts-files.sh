#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   ./create_ts_files.sh "fileOne,fileTwo,fileThree" [target_directory]
# Example:
#   ./create_ts_files.sh "longestStringLength,generateAsciiTable,prettyDifference,prettify" src/utils

# Make sure to chmod +x this script
# chmod +x create-ts-files.sh

input_files="${1:-}"
target_dir="${2:-.}"

if [[ -z "$input_files" ]]; then
  echo "error: you must pass a comma-separated list of file names"
  exit 1
fi

mkdir -p "$target_dir"

IFS=',' read -ra files <<< "$input_files"

for name in "${files[@]}"; do
  trimmed="$(echo "$name" | xargs)"
  fpath="$target_dir/$trimmed.ts"
  if [[ -e "$fpath" ]]; then
    echo "exists  $fpath"
    continue
  fi
  touch "$fpath"
  echo "created $fpath"
done

echo "done"
