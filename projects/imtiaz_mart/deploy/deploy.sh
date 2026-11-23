#!/usr/bin/env bash
# Deploy the latest code with ZERO downtime. Run on the server as the ubuntu user:
#   bash /opt/system-design/projects/imtiaz_mart/deploy/deploy.sh
#
# Rolling restart: restart ONE API process at a time and wait until it's healthy before the
# next. Nginx keeps sending traffic to the other two, so users never see an error.
set -euo pipefail

REPO=/opt/system-design
APP=$REPO/projects/imtiaz_mart
PORTS=(4001 4002 4003)

echo "==> Pull latest code"
git -C "$REPO" pull --ff-only

echo "==> Backend dependencies (production only)"
cd "$APP/backend" && npm ci --omit=dev

echo "==> Build frontend"
cd "$APP/frontend" && npm ci && npm run build
# No --delete: keep old hashed assets, so a visitor still on the previous version
# can load its lazy pages. They're small; clean them up occasionally.
sudo rsync -a dist/ /var/www/scale_cart/

echo "==> Rolling restart"
for port in "${PORTS[@]}"; do
  sudo systemctl restart "scalecart-api@$port"
  for i in $(seq 1 60); do
    if curl -fsS "http://127.0.0.1:$port/health" > /dev/null 2>&1; then
      echo "    $port healthy"
      break
    fi
    if [ "$i" -eq 60 ]; then
      echo "    $port did NOT become healthy in 30 s. Stopping here; the other processes keep serving."
      echo "    Logs: journalctl -u scalecart-api@$port -n 50"
      exit 1
    fi
    sleep 0.5
  done
done

echo "==> Done"
