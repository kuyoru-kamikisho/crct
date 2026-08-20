#!/usr/bin/env bash
# 重新签发 / 续期 kuyoru.com 通配符证书（*.kuyoru.com），并安装到 v2ray-agent / nginx。
#
# 在 Ubuntu 服务器上以 root 执行：
#   chmod +x renew-cert.sh
#   ./renew-cert.sh          # 未到期则跳过签发，仍会同步安装并重载
#   ./renew-cert.sh --force  # 无论是否到期都重新签发
#
# Cloudflare Token 优先用上次签发时 acme.sh 已保存的配置。
# 若失效，在同目录放 tls.env，或执行前 export：
#   CF_Token / CF_Zone_ID / CF_Account_ID / ACME_EMAIL

set -euo pipefail

DOMAIN="kuyoru.com"
WILDCARD="*.${DOMAIN}"
TLS_DIR="/etc/v2ray-agent/tls"
INSTALLED_CERT="${TLS_DIR}/${DOMAIN}.crt"
INSTALLED_KEY="${TLS_DIR}/${DOMAIN}.key"
# Xray / nginx subscribe.conf 仍读取这对文件名
LEGACY_CERT="${TLS_DIR}/anime.kuyoru.com.crt"
LEGACY_KEY="${TLS_DIR}/anime.kuyoru.com.key"

FORCE=0
if [[ "${1:-}" == "--force" || "${1:-}" == "-f" ]]; then
  FORCE=1
fi

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }
die() { echo "错误: $*" >&2; exit 1; }

if [[ "$(id -u)" -ne 0 ]]; then
  die "请用 root 执行"
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -f "${SCRIPT_DIR}/tls.env" ]]; then
  # shellcheck disable=SC1091
  set -a
  source "${SCRIPT_DIR}/tls.env"
  set +a
  log "已加载 ${SCRIPT_DIR}/tls.env"
fi

if [[ -x "${HOME}/.acme.sh/acme.sh" ]]; then
  ACME="${HOME}/.acme.sh/acme.sh"
elif [[ -x /root/.acme.sh/acme.sh ]]; then
  ACME="/root/.acme.sh/acme.sh"
else
  die "找不到 acme.sh，请确认已安装在 ~/.acme.sh/acme.sh"
fi

ECC_CERT="${HOME}/.acme.sh/${DOMAIN}_ecc/${DOMAIN}.cer"
if [[ ! -f "${ECC_CERT}" && -f "/root/.acme.sh/${DOMAIN}_ecc/${DOMAIN}.cer" ]]; then
  ECC_CERT="/root/.acme.sh/${DOMAIN}_ecc/${DOMAIN}.cer"
fi

"${ACME}" --set-default-ca --server letsencrypt >/dev/null

if [[ -n "${ACME_EMAIL:-}" ]]; then
  "${ACME}" --register-account -m "${ACME_EMAIL}" >/dev/null || true
fi

mkdir -p "${TLS_DIR}"

install_and_reload() {
  "${ACME}" --install-cert -d "${DOMAIN}" --ecc \
    --fullchain-file "${INSTALLED_CERT}" \
    --key-file "${INSTALLED_KEY}" \
    --reloadcmd "true"

  cp -f "${INSTALLED_CERT}" "${LEGACY_CERT}"
  cp -f "${INSTALLED_KEY}" "${LEGACY_KEY}"
  chmod 600 "${INSTALLED_KEY}" "${LEGACY_KEY}"
  chmod 644 "${INSTALLED_CERT}" "${LEGACY_CERT}"

  nginx -t
  nginx -s reload
  systemctl restart xray

  log "已安装证书:"
  log "  ${INSTALLED_CERT}"
  log "  ${LEGACY_CERT}"
  openssl x509 -in "${INSTALLED_CERT}" -noout -subject -dates -ext subjectAltName
}

issue_new() {
  log "本地没有 ${DOMAIN} 的 ECC 证书，开始首次签发"
  "${ACME}" --issue -d "${DOMAIN}" -d "${WILDCARD}" --dns dns_cf --keylength ec-256
}

renew_existing() {
  local extra=()
  if [[ "${FORCE}" -eq 1 ]]; then
    extra+=(--force)
    log "强制重新签发 ${DOMAIN} / ${WILDCARD}"
  else
    log "尝试续期 ${DOMAIN} / ${WILDCARD}（未到期会跳过签发）"
  fi

  # acme.sh：0 成功，2 未到期跳过
  set +e
  "${ACME}" --renew -d "${DOMAIN}" --ecc "${extra[@]}"
  local rc=$?
  set -e
  if [[ "${rc}" -eq 0 || "${rc}" -eq 2 ]]; then
    return 0
  fi
  die "续期失败，acme.sh 退出码 ${rc}"
}

if [[ -f "${ECC_CERT}" ]]; then
  renew_existing
else
  issue_new
fi

install_and_reload
log "完成"
