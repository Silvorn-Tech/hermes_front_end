#!/usr/bin/bash
# One-time (idempotent) installer for the Hermes frontend's pull-based deploy
# on ROMEO. Mirrors /opt/hermes-v2's exact mechanism: a systemd timer runs a
# deploy.sh every 5 minutes that pulls ghcr.io/silvorn-tech/hermes_front_end,
# compares the image digest, and recreates the container on change.
#
# Run this manually, with sudo, after reviewing it:
#   sudo bash deploy/romeo-setup.sh
#
# Order matters: the GitHub Actions workflow (.github/workflows/docker.yml)
# must have published at least one image to GHCR before the timer's first
# tick, otherwise deploy.sh's `docker compose pull` fails until an image
# exists. Merge this branch to main (or run the workflow manually) first.
set -Eeuo pipefail

if [[ $EUID -ne 0 ]]; then
  echo "Run as root (sudo bash deploy/romeo-setup.sh)." >&2
  exit 1
fi

readonly APP_DIR="/opt/hermes-front-end"
readonly SERVICE_NAME="hermes-front-end-deploy"
readonly LISTEN_PORT="8081"   # loopback port the container publishes to
readonly TAILSCALE_HTTPS_PORT="8443"
# ntfy.sh push notification when deploy.sh actually deploys (or fails) --
# not a secret (ntfy.sh topics are unauthenticated by default: anyone who
# knows this string could publish/subscribe to it), just unguessable
# enough that nobody stumbles onto it by chance. Subscribe from the
# ntfy app/https://ntfy.sh/<topic> to receive these. Rotate by changing
# this constant and re-running this script (idempotent).
readonly NTFY_TOPIC="hermes-deploys-389525f241fb"

mkdir -p "$APP_DIR"

cat > "$APP_DIR/compose.yaml" <<'COMPOSE'
services:
  hermes-front-end:
    container_name: hermes-front-end
    image: ghcr.io/silvorn-tech/hermes_front_end:latest
    restart: unless-stopped
    ports:
      - "127.0.0.1:8081:8080"
    logging:
      driver: local
      options:
        max-size: "10m"
        max-file: "3"
COMPOSE

cat > "$APP_DIR/deploy.sh" <<'DEPLOY'
#!/usr/bin/bash
set -Eeuo pipefail

readonly DOCKER_BIN="/usr/bin/docker"
readonly COMPOSE_FILE="/opt/hermes-front-end/compose.yaml"
readonly SERVICE_NAME="hermes-front-end"
readonly CONTAINER_NAME="hermes-front-end"
readonly IMAGE="ghcr.io/silvorn-tech/hermes_front_end:latest"
readonly PRE_DEPLOY_HOOK="/opt/hermes-front-end/can-deploy"
readonly LOCK_FILE="/run/hermes-front-end-deploy/deploy.lock"
readonly NTFY_TOPIC="hermes-deploys-389525f241fb"

log() {
  printf '%s %s\n' "$(/usr/bin/date --iso-8601=seconds)" "$*"
}

# Best-effort: a notification failure (ntfy.sh unreachable, DNS hiccup,
# etc.) must never fail the deploy itself, so errors here are swallowed.
notify() {
  /usr/bin/curl -fsS -m 10 -H "Title: $1" -d "$2" \
    "https://ntfy.sh/${NTFY_TOPIC}" >/dev/null 2>&1 || true
}

fail() {
  log "decision=error result=failure reason=$1"
  notify "hermes-front-end deploy FAILED" "$1"
  exit 1
}

image_id() {
  "$DOCKER_BIN" image inspect --format '{{.Id}}' "$IMAGE"
}

if [[ ! -f "$COMPOSE_FILE" ]]; then
  fail "compose-file-missing"
fi

if [[ ! -x "$PRE_DEPLOY_HOOK" ]]; then
  fail "pre-deploy-hook-missing-or-not-executable"
fi

exec 9>"$LOCK_FILE"

if ! /usr/bin/flock -n 9; then
  log "decision=skipped result=success reason=deployment-already-running"
  exit 0
fi

previous_digest="$(
  "$DOCKER_BIN" inspect --format '{{.Image}}' "$CONTAINER_NAME" 2>/dev/null || true
)"

previous_digest="${previous_digest:-none}"

log "decision=check previous_digest=$previous_digest"

"$DOCKER_BIN" compose -f "$COMPOSE_FILE" pull "$SERVICE_NAME"

new_digest="$(image_id)"

if [[ "$previous_digest" == "$new_digest" ]]; then
  log "decision=no-change previous_digest=$previous_digest new_digest=$new_digest result=success"
  exit 0
fi

if ! "$PRE_DEPLOY_HOOK"; then
  log "decision=blocked previous_digest=$previous_digest new_digest=$new_digest result=success reason=pre-deploy-check"
  exit 0
fi

log "decision=deploy previous_digest=$previous_digest new_digest=$new_digest"

"$DOCKER_BIN" compose -f "$COMPOSE_FILE" up -d "$SERVICE_NAME"

deployed_digest="$("$DOCKER_BIN" inspect --format '{{.Image}}' "$CONTAINER_NAME")"

if [[ "$deployed_digest" != "$new_digest" ]]; then
  fail "deployed-image-mismatch expected=$new_digest actual=$deployed_digest"
fi

log "decision=deployed previous_digest=$previous_digest new_digest=$new_digest result=success"
notify "hermes-front-end deployed" "${previous_digest:0:12} -> ${new_digest:0:12}"
DEPLOY

cat > "$APP_DIR/can-deploy" <<'HOOK'
#!/usr/bin/bash

# Extension point, mirrors /opt/hermes-v2/can-deploy. Intentionally permits
# all deployments until a real pre-deploy condition is needed.

exit 0
HOOK

chown -R root:root "$APP_DIR"
chmod 755 "$APP_DIR" "$APP_DIR/deploy.sh" "$APP_DIR/can-deploy"
chmod 644 "$APP_DIR/compose.yaml"

cat > "/etc/systemd/system/${SERVICE_NAME}.service" <<UNIT
[Unit]
Description=Hermes frontend image update and deployment check
Wants=docker.service network-online.target
After=docker.service network-online.target

[Service]
Type=oneshot
User=hermes-deploy
Group=hermes-deploy
SupplementaryGroups=docker
Environment=HOME=/home/hermes-deploy
ExecStart=${APP_DIR}/deploy.sh

RuntimeDirectory=${SERVICE_NAME}
RuntimeDirectoryMode=0750

NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=read-only
ProtectKernelTunables=true
ProtectKernelModules=true
ProtectControlGroups=true
RestrictSUIDSGID=true
LockPersonality=true
RestrictRealtime=true
ReadOnlyPaths=${APP_DIR}
UNIT

cat > "/etc/systemd/system/${SERVICE_NAME}.timer" <<TIMER
[Unit]
Description=Run Hermes frontend deployment check every five minutes

[Timer]
OnBootSec=3min
OnUnitActiveSec=5min
Persistent=true
Unit=${SERVICE_NAME}.service

[Install]
WantedBy=timers.target
TIMER

systemctl daemon-reload
systemctl enable --now "${SERVICE_NAME}.timer"

echo "Registering Tailscale Serve listener on :${TAILSCALE_HTTPS_PORT} -> 127.0.0.1:${LISTEN_PORT}"
tailscale serve --bg --https="${TAILSCALE_HTTPS_PORT}" "http://127.0.0.1:${LISTEN_PORT}"

echo
echo "Done. Status:"
systemctl status "${SERVICE_NAME}.timer" --no-pager
tailscale serve status

cat <<NEXT

Subscribe to deploy notifications: install the ntfy app (or open
https://ntfy.sh/${NTFY_TOPIC} in a browser) and subscribe to the topic
"${NTFY_TOPIC}" -- you'll get a push the moment deploy.sh actually
deploys something (or fails). Routine "no-change" ticks stay silent.

NEXT

cat <<'NEXT'
Reminders:
- If `docker compose pull` fails with "unauthorized" or "manifest unknown" on
  the first tick, GHCR either has no image yet (merge to main / run the
  "Publish Docker image" workflow first) or the hermes-deploy user's stored
  GHCR login lacks read:packages on hermes_front_end specifically.
- HERMES_ALLOWED_RETURN_URIS must include
  https://romeo-dev-zone.tailed9c54.ts.net:8443/login in
  /opt/hermes-v2/.env, then `docker compose -f /opt/hermes-v2/compose.yaml
  restart hermes-v2` to pick it up. It is currently unset in production,
  which independently blocks Google login regardless of this frontend
  deployment.
NEXT
