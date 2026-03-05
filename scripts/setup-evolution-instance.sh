#!/bin/bash
# =====================================================
# Script de inicialización de instancia Evolution API
# Ejecutar UNA SOLA VEZ después de levantar los contenedores
# Uso: bash scripts/setup-evolution-instance.sh
# =====================================================

set -e

# Cargar variables del entorno
if [ -f .env.production ]; then
  export $(grep -v '^#' .env.production | xargs)
elif [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

# Para este script usamos localhost:8080 (acceso desde el host)
EVOLUTION_HOST="http://localhost:8080"
INSTANCE="${EVOLUTION_INSTANCE:-roomie_instancia}"
API_KEY="${EVOLUTION_API_KEY}"

if [ -z "$API_KEY" ]; then
  echo "ERROR: EVOLUTION_API_KEY no está definida en .env.production"
  exit 1
fi

echo "================================================"
echo "  Evolution API - Configuración de instancia"
echo "  Instancia: $INSTANCE"
echo "  Host: $EVOLUTION_HOST"
echo "================================================"
echo ""

# 1. Verificar que Evolution API esté corriendo
echo "[1/5] Verificando que Evolution API esté disponible..."
for i in $(seq 1 10); do
  if curl -s -o /dev/null -w "%{http_code}" -H "apikey: $API_KEY" "$EVOLUTION_HOST/instance/instances" | grep -q "200"; then
    echo "  ✓ Evolution API está disponible"
    break
  fi
  if [ $i -eq 10 ]; then
    echo "  ✗ Evolution API no responde después de 10 intentos"
    echo "  Verifica: docker compose -f docker-compose.prod.yml ps"
    exit 1
  fi
  echo "  Esperando Evolution API... intento $i/10"
  sleep 5
done

echo ""

# 2. Verificar si la instancia ya existe
echo "[2/5] Verificando instancia '$INSTANCE'..."
INSTANCES=$(curl -s -H "apikey: $API_KEY" "$EVOLUTION_HOST/instance/instances")
INSTANCE_EXISTS=$(echo "$INSTANCES" | grep -c "\"$INSTANCE\"" || true)

if [ "$INSTANCE_EXISTS" -gt 0 ]; then
  echo "  La instancia '$INSTANCE' ya existe."
  read -rp "  ¿Eliminarla y recrearla? (s/N): " RECREAR
  if [ "$RECREAR" = "s" ] || [ "$RECREAR" = "S" ]; then
    echo "  Eliminando instancia existente..."
    curl -s -X DELETE -H "apikey: $API_KEY" "$EVOLUTION_HOST/instance/delete/$INSTANCE" > /dev/null
    echo "  ✓ Instancia eliminada"
    sleep 2
  else
    echo "  Usando instancia existente."
    SKIP_CREATE=true
  fi
fi

echo ""

# 3. Crear la instancia
if [ -z "$SKIP_CREATE" ]; then
  echo "[3/5] Creando instancia '$INSTANCE'..."
  CREATE_RESULT=$(curl -s -X POST \
    -H "apikey: $API_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"instanceName\": \"$INSTANCE\", \"qrcode\": true, \"integration\": \"WHATSAPP-BAILEYS\"}" \
    "$EVOLUTION_HOST/instance/create")

  if echo "$CREATE_RESULT" | grep -q "\"instance\""; then
    echo "  ✓ Instancia creada exitosamente"
  else
    echo "  Error al crear instancia:"
    echo "$CREATE_RESULT"
    exit 1
  fi
else
  echo "[3/5] Omitiendo creación (instancia ya existe)"
fi

echo ""
sleep 2

# 4. Obtener QR code
echo "[4/5] Obteniendo QR code para conectar WhatsApp..."
echo "  (Abre WhatsApp → Dispositivos vinculados → Vincular dispositivo)"
echo ""

QR_RESPONSE=$(curl -s -H "apikey: $API_KEY" "$EVOLUTION_HOST/instance/connect/$INSTANCE")

if echo "$QR_RESPONSE" | grep -q "base64"; then
  echo "  ✓ QR generado correctamente"
  echo ""
  echo "  El QR está disponible en:"
  echo "  → URL: http://localhost:8080/instance/connect/$INSTANCE"
  echo "  → O accede al Manager en: http://localhost:8080/"
  echo ""
  echo "  TAMBIÉN puedes ver el QR con:"
  echo "  curl -s -H 'apikey: $API_KEY' http://localhost:8080/instance/connect/$INSTANCE | python3 -c \"import sys,json; d=json.load(sys.stdin); print(d.get('qrcode',{}).get('base64','No QR')[:50],'...')\""
elif echo "$QR_RESPONSE" | grep -q "already"; then
  echo "  La instancia ya está conectada (no se necesita QR)"
else
  echo "  Respuesta de connect:"
  echo "$QR_RESPONSE"
fi

echo ""
read -rp "[4/5] Presiona ENTER después de escanear el QR con WhatsApp..."

# 5. Configurar webhook
echo "[5/5] Configurando webhook hacia el bot..."

# Detectar URL del webhook (dentro de Docker = nombre de servicio)
WEBHOOK_URL="http://whatsapp-bot:3020/webhook"

WEBHOOK_RESULT=$(curl -s -X POST \
  -H "apikey: $API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"url\": \"$WEBHOOK_URL\",
    \"webhook_by_events\": false,
    \"webhook_base64\": false,
    \"events\": [\"MESSAGES_UPSERT\", \"CONNECTION_UPDATE\"]
  }" \
  "$EVOLUTION_HOST/webhook/set/$INSTANCE")

if echo "$WEBHOOK_RESULT" | grep -q "webhook"; then
  echo "  ✓ Webhook configurado: $WEBHOOK_URL"
else
  echo "  Respuesta del webhook:"
  echo "$WEBHOOK_RESULT"
fi

echo ""
echo "================================================"
echo "  ✓ Configuración completada"
echo ""
echo "  Verifica el estado de la instancia con:"
echo "  curl -s -H 'apikey: $API_KEY' http://localhost:8080/instance/fetchInstances | python3 -m json.tool"
echo "================================================"
