#!/bin/bash
# Script para iniciar Cloudflared en Linux/macOS
# Uso: bash scripts/start-cloudflared.sh

echo "🌐 Iniciando túnel Cloudflared para n8n..."

# Verificar que n8n esté corriendo
if ! docker-compose ps n8n | grep -q "Up"; then
    echo "❌ Error: n8n no está corriendo. Ejecuta primero: docker-compose up -d"
    exit 1
fi

echo "✅ n8n está corriendo"
echo ""
echo "📋 Instrucciones:"
echo "1. Copia la URL HTTPS que aparece abajo"
echo "2. Actualiza WEBHOOK_URL en tu archivo .env"
echo "3. Reinicia n8n: docker-compose restart n8n"
echo "4. NO CIERRES esta terminal mientras uses Telegram"
echo ""
echo "Presiona CTRL+C para detener el túnel"
echo ""

# Iniciar Cloudflared
cloudflared tunnel --url http://localhost:5678














