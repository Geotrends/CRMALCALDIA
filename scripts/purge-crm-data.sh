#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

docker cp "$ROOT/scripts/purge-crm-data.php" espocrm:/tmp/purge-crm-data.php
docker exec espocrm php /tmp/purge-crm-data.php
