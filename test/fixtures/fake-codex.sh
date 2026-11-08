#!/usr/bin/env bash

# Simpan argumen yang diterima bila path FIXTURE_LOG_ARGS ditentukan
if [ -n "$FIXTURE_LOG_ARGS" ]; then
  echo "$@" > "$FIXTURE_LOG_ARGS"
fi

# Bila argumen berisi --fail atau env FAKE_FAIL di-set
for arg in "$@"; do
  if [ "$arg" = "--fail" ]; then
    echo "Error: Simulasi kegagalan codex" >&2
    exit 1
  fi
done

if [ "$FAKE_FAIL" = "1" ]; then
  echo "Error: Simulasi kegagalan codex via env" >&2
  exit 1
fi

echo "Hasil review teks dari fake codex berhasil dibuat."
exit 0
