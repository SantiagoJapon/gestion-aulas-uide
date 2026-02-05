#!/bin/bash
# ============================================
# Script de Despliegue - Gestion Aulas UIDE
# ============================================
# Ejecutar en el VPS despues de clonar el repositorio
# chmod +x deploy.sh && ./deploy.sh
# ============================================

set -e

echo "============================================"
echo " Despliegue - Gestion de Aulas UIDE"
echo "============================================"

# 1. Verificar Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker no instalado. Instalando..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
    echo "✅ Docker instalado. Cierra sesion y vuelve a entrar para usar Docker sin sudo."
    exit 1
fi

echo "✅ Docker: $(docker --version)"

# 2. Verificar Docker Compose
if ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose no disponible"
    exit 1
fi

echo "✅ Docker Compose: $(docker compose version --short)"

# 3. Verificar archivo .env.production
ENV_FILE=".env.production"

if [ ! -f "$ENV_FILE" ]; then
    echo ""
    echo "⚠️  No existe $ENV_FILE"
    echo "   Copiando template..."
    cp .env.production.example "$ENV_FILE"
    echo ""
    echo "📝 IMPORTANTE: Edita $ENV_FILE con tus valores reales:"
    echo "   nano $ENV_FILE"
    echo ""
    echo "   Valores OBLIGATORIOS:"
    echo "   - DB_PASSWORD (password seguro para PostgreSQL)"
    echo "   - JWT_SECRET (ejecuta: openssl rand -base64 32)"
    echo "   - N8N_PASSWORD (password para n8n)"
    echo "   - TELEGRAM_BOT_TOKEN (token de @BotFather)"
    echo "   - FRONTEND_URL (http://TU_IP o https://tudominio.com)"
    echo ""
    echo "   Cuando termines, ejecuta este script de nuevo."
    exit 0
fi

# 4. Verificar que las variables criticas no son placeholder
source "$ENV_FILE"

if [[ "$DB_PASSWORD" == *"CAMBIAR"* ]] || [[ -z "$DB_PASSWORD" ]]; then
    echo "❌ DB_PASSWORD no configurado en $ENV_FILE"
    exit 1
fi

if [[ "$JWT_SECRET" == *"CAMBIAR"* ]] || [[ -z "$JWT_SECRET" ]]; then
    echo "❌ JWT_SECRET no configurado en $ENV_FILE"
    exit 1
fi

if [[ "$N8N_PASSWORD" == *"CAMBIAR"* ]] || [[ -z "$N8N_PASSWORD" ]]; then
    echo "❌ N8N_PASSWORD no configurado en $ENV_FILE"
    exit 1
fi

if [[ -z "$TELEGRAM_BOT_TOKEN" ]] || [[ "$TELEGRAM_BOT_TOKEN" == "TU_TOKEN"* ]]; then
    echo "⚠️  TELEGRAM_BOT_TOKEN no configurado (el bot no arrancara)"
fi

echo "✅ Variables de entorno verificadas"

# 5. Construir y levantar servicios
echo ""
echo "🔨 Construyendo imagenes..."
docker compose -f docker-compose.prod.yml --env-file "$ENV_FILE" build

echo ""
echo "🚀 Levantando servicios..."
docker compose -f docker-compose.prod.yml --env-file "$ENV_FILE" up -d

# 6. Esperar a que los servicios esten listos
echo ""
echo "⏳ Esperando a que los servicios inicien..."
sleep 10

# 7. Verificar estado
echo ""
echo "============================================"
echo " Estado de los servicios"
echo "============================================"
docker compose -f docker-compose.prod.yml ps

# 8. Health check del backend
echo ""
echo "🔍 Verificando backend..."
for i in {1..5}; do
    if curl -s http://localhost/api/health > /dev/null 2>&1; then
        echo "✅ Backend respondiendo correctamente"
        break
    elif curl -s http://localhost/health > /dev/null 2>&1; then
        echo "✅ Backend respondiendo correctamente"
        break
    else
        if [ $i -eq 5 ]; then
            echo "⚠️  Backend no responde aun. Revisa los logs:"
            echo "   docker compose -f docker-compose.prod.yml logs backend"
        else
            echo "   Intento $i/5 - esperando..."
            sleep 5
        fi
    fi
done

# 9. Verificar frontend
echo ""
echo "🔍 Verificando frontend..."
if curl -s http://localhost/ > /dev/null 2>&1; then
    echo "✅ Frontend cargando correctamente"
else
    echo "⚠️  Frontend no responde. Revisa:"
    echo "   docker compose -f docker-compose.prod.yml logs nginx"
fi

echo ""
echo "============================================"
echo " ¡Despliegue completado!"
echo "============================================"
echo ""
echo "🌐 Frontend: http://$(hostname -I | awk '{print $1}')"
echo "🔌 API:      http://$(hostname -I | awk '{print $1}')/api/health"
echo "🤖 Bot:      Envia /start al bot en Telegram"
echo ""
echo "📋 Comandos utiles:"
echo "   Ver logs:     docker compose -f docker-compose.prod.yml logs -f"
echo "   Ver estado:   docker compose -f docker-compose.prod.yml ps"
echo "   Reiniciar:    docker compose -f docker-compose.prod.yml restart"
echo "   Detener:      docker compose -f docker-compose.prod.yml down"
echo "   Actualizar:   git pull && docker compose -f docker-compose.prod.yml up -d --build"
echo ""
echo "🔐 Para SSL con Let's Encrypt:"
echo "   1. Apunta tu dominio a esta IP"
echo "   2. docker compose -f docker-compose.prod.yml run certbot certonly --webroot -w /var/www/certbot -d tudominio.com"
echo "   3. Descomentar lineas SSL en nginx/nginx.conf"
echo "   4. docker compose -f docker-compose.prod.yml restart nginx"
echo ""
