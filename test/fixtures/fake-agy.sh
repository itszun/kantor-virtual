#!/usr/bin/env bash

# Simpan argumen yang diterima bila path FIXTURE_LOG_ARGS ditentukan
if [ -n "$FIXTURE_LOG_ARGS" ]; then
  echo "$@" > "$FIXTURE_LOG_ARGS"
fi

# Bila argumen berisi --fail atau env FAKE_FAIL di-set
for arg in "$@"; do
  if [ "$arg" = "--fail" ]; then
    echo '{"status":"ERROR","error":"Perintah gagal"}'
    exit 1
  fi
done

if [ "$FAKE_FAIL" = "1" ]; then
  echo '{"status":"ERROR","error":"Perintah gagal via env"}'
  exit 1
fi

cat <<'EOF'
{
  "conversation_id": "conv-fake-123",
  "status": "SUCCESS",
  "response": "Halo dari fake agy! Pekerjaan berhasil diselesaikan.",
  "duration_seconds": 2.5,
  "num_turns": 1,
  "usage": {
    "input_tokens": 150,
    "output_tokens": 75,
    "thinking_tokens": 25,
    "cache_read_tokens": 10,
    "total_tokens": 225
  }
}
EOF
exit 0
