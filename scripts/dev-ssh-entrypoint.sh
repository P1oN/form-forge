#!/usr/bin/env bash
set -euo pipefail

mkdir -p /var/run/sshd
ssh-keygen -A

DEV_USER="${DEV_SSH_USER:-dev}"
DEV_UID="${DEV_SSH_UID:-1000}"
DEV_GID="${DEV_SSH_GID:-1000}"
AUTHORIZED_KEYS_PATH="/workspace/.devcontainer/authorized_keys"
EFFECTIVE_USER="${DEV_USER}"
EFFECTIVE_GROUP="${DEV_USER}"

if getent group "${DEV_GID}" >/dev/null 2>&1; then
  EFFECTIVE_GROUP="$(getent group "${DEV_GID}" | cut -d: -f1)"
elif getent group "${DEV_USER}" >/dev/null 2>&1; then
  EFFECTIVE_GROUP="${DEV_USER}"
else
  groupadd -g "${DEV_GID}" "${DEV_USER}"
  EFFECTIVE_GROUP="${DEV_USER}"
fi

if id -u "${DEV_USER}" >/dev/null 2>&1; then
  EFFECTIVE_USER="${DEV_USER}"
elif getent passwd "${DEV_UID}" >/dev/null 2>&1; then
  EFFECTIVE_USER="$(getent passwd "${DEV_UID}" | cut -d: -f1)"
else
  useradd -m -u "${DEV_UID}" -g "${EFFECTIVE_GROUP}" -s /bin/bash "${DEV_USER}"
  EFFECTIVE_USER="${DEV_USER}"
fi

USER_HOME="$(getent passwd "${EFFECTIVE_USER}" | cut -d: -f6)"
if [[ -z "${USER_HOME}" ]]; then
  USER_HOME="/home/${EFFECTIVE_USER}"
fi
mkdir -p "${USER_HOME}/.ssh"

if [[ -f "${AUTHORIZED_KEYS_PATH}" ]]; then
  cp "${AUTHORIZED_KEYS_PATH}" "${USER_HOME}/.ssh/authorized_keys"
fi

chown -R "${EFFECTIVE_USER}:${EFFECTIVE_GROUP}" "${USER_HOME}/.ssh"
chmod 700 "${USER_HOME}/.ssh"
if [[ -f "${USER_HOME}/.ssh/authorized_keys" ]]; then
  chmod 600 "${USER_HOME}/.ssh/authorized_keys"
fi

# Some base images ship non-root users as "locked", which blocks pubkey auth.
# Password authentication remains disabled in sshd_config below.
if passwd -S "${EFFECTIVE_USER}" 2>/dev/null | awk '{print $2}' | grep -q '^L$'; then
  passwd -d "${EFFECTIVE_USER}" >/dev/null 2>&1 || true
  usermod -U "${EFFECTIVE_USER}" >/dev/null 2>&1 || true
fi

cat >/etc/ssh/sshd_config <<EOF
Port 22
AddressFamily any
ListenAddress 0.0.0.0
Protocol 2
PermitRootLogin no
PasswordAuthentication no
KbdInteractiveAuthentication no
PubkeyAuthentication yes
ChallengeResponseAuthentication no
UsePAM no
X11Forwarding no
AllowUsers ${EFFECTIVE_USER}
AuthorizedKeysFile .ssh/authorized_keys
Subsystem sftp /usr/lib/openssh/sftp-server
EOF

echo "Starting SSH server for user ${EFFECTIVE_USER} on port 22"
exec /usr/sbin/sshd -D -e
