#!/usr/bin/env bash
# Calcula y guarda la huella del código custom para omitir deploys repetidos.

deploy_stamp_repo_root() {
  echo "${REPO_ROOT:-/opt/bootstrap/repo}"
}

deploy_stamp_compute() {
  local repo
  repo="$(deploy_stamp_repo_root)"

  if ! command -v md5sum >/dev/null 2>&1; then
    date +%s
    return
  fi

  find "$repo/espocrm-custom" "$repo/scripts" -type f 2>/dev/null \
    | LC_ALL=C sort \
    | xargs md5sum 2>/dev/null \
    | md5sum \
    | awk '{print $1}'
}

deploy_stamp_write() {
  local stamp_file="${1:-/var/www/html/data/.custom-deploy-stamp}"
  local stamp

  stamp="$(deploy_stamp_compute)"
  mkdir -p "$(dirname "$stamp_file")"
  echo "$stamp" > "$stamp_file"
  chown www-data:www-data "$stamp_file" 2>/dev/null || true
}
