#!/bin/sh
# Spec 018: arranque del contenedor. Con RUN_MIGRATIONS_ON_START=true aplica
# las migraciones pendientes antes de la API (Render gratuito no tiene un paso
# previo al despliegue). Docker Compose usa su servicio migrate y no lo activa.
set -e
if [ "$RUN_MIGRATIONS_ON_START" = "true" ]; then
  node node_modules/typeorm/cli.js migration:run -d dist/platform/database/data-source.js
fi
exec node dist/main.js
