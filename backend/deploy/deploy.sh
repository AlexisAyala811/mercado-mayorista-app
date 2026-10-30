#!/usr/bin/env sh
# Despliega una versión de la API: descarga la imagen, aplica migraciones,
# reemplaza el contenedor y comprueba la salud. Si la nueva versión no queda
# sana, vuelve a la anterior. Uso: API_IMAGE=ghcr.io/... ./deploy.sh sha-xxxx
set -eu

TAG="${1:?Indica la etiqueta de la imagen}"
: "${API_IMAGE:?Define API_IMAGE}"
cd "$(dirname "$0")"

COMPOSE="docker compose -f compose.prod.yaml"
PREVIOUS="$(cat .current-tag 2>/dev/null || true)"
HEALTH_URL="http://127.0.0.1:${PORT:-3000}/api/v1/health/ready"

healthy() {
  i=0
  while [ "$i" -lt 30 ]; do
    if wget -q -O /dev/null "$HEALTH_URL" 2>/dev/null || curl -fsS -o /dev/null "$HEALTH_URL" 2>/dev/null; then
      return 0
    fi
    i=$((i + 1))
    sleep 2
  done
  return 1
}

start() {
  export API_IMAGE API_TAG="$1"
  $COMPOSE pull migrate api
  # Las migraciones deben ser compatibles con la versión anterior
  # (expandir y luego contraer) para que la reversión sea segura.
  $COMPOSE run --rm migrate
  $COMPOSE up -d --remove-orphans api
}

echo "Desplegando $API_IMAGE:$TAG (anterior: ${PREVIOUS:-ninguna})"
start "$TAG"

if healthy; then
  echo "$TAG" > .current-tag
  echo "Despliegue correcto: $TAG"
  docker image prune -f >/dev/null
  exit 0
fi

echo "La versión $TAG no respondió en $HEALTH_URL" >&2
if [ -n "$PREVIOUS" ]; then
  echo "Revirtiendo a $PREVIOUS" >&2
  export API_TAG="$PREVIOUS"
  $COMPOSE up -d api
  healthy && echo "Reversión correcta a $PREVIOUS" >&2
fi
exit 1
