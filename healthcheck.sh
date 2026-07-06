#!/bin/bash
# healthcheck.sh — Verificación post-despliegue, Gestion Aulas UIDE
# Uso: ./deploy.sh && ./healthcheck.sh
set -uo pipefail

COMPOSE="docker compose -f docker-compose.prod.yml"
DOMAIN="${DOMAIN:-}"
BASE_URL="http://127.0.0.1"
[ -n "$DOMAIN" ] && BASE_URL="https://$DOMAIN"

FAIL=0
check() {
  local name="$1" url="$2" expected="${3:-200}"
  code=$(curl -sk -o /dev/null -w "%{http_code}" "$url" --max-time 8)
  if [ "$code" = "$expected" ]; then
    echo "✅ $name ($code)"
  else
    echo "❌ $name — esperado $expected, obtuvo $code ($url)"
    FAIL=1
  fi
}

echo "== Estado de contenedores =="
$COMPOSE ps
UNHEALTHY=$($COMPOSE ps --format json 2>/dev/null | grep -c '"Health":"unhealthy"' || true)
[ "$UNHEALTHY" != "0" ] && { echo "❌ Hay contenedores unhealthy"; FAIL=1; }

echo ""
echo "== Endpoints internos =="
check "Backend health"   "http://127.0.0.1:3000/api/health"
check "n8n healthz"      "http://127.0.0.1:5678/healthz"
check "Evolution API"    "http://127.0.0.1:8080/"

echo ""
echo "== Endpoints públicos (vía Nginx) =="
check "Frontend"         "$BASE_URL/"
check "API pública"      "$BASE_URL/api/health"
check "n8n público"      "$BASE_URL/n8n/"

echo ""
echo "== Configuración crítica =="
grep -q "localhost" .env.production 2>/dev/null && echo "⚠️  .env.production todavía contiene 'localhost'"
grep -q "CAMBIAR\|GENERAR" .env.production 2>/dev/null && { echo "❌ .env.production tiene placeholders sin reemplazar"; FAIL=1; }

if [ "$FAIL" = "0" ]; then
  echo ""
  echo "✅ Todo OK — sistema operativo para todos los roles"
else
  echo ""
  echo "❌ Hay fallos — revisa los mensajes arriba y la sección de troubleshooting"
  exit 1
fi
