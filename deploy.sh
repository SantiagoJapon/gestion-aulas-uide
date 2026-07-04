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

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info()  { echo -e "${GREEN}✅${NC} $1"; }
warn()  { echo -e "${YELLOW}⚠️  $1${NC}"; }
error() { echo -e "${RED}❌ $1${NC}"; }

# 1. Verificar Docker
if ! command -v docker &> /dev/null; then
    error "Docker no instalado. Instalando..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
    warn "Docker instalado. Cierra sesion y vuelve a entrar."
    exit 1
fi
info "Docker: $(docker --version)"

# 2. Verificar Docker Compose
if ! docker compose version &> /dev/null; then
    error "Docker Compose no disponible"
    exit 1
fi
info "Docker Compose: $(docker compose version --short)"

# 3. Verificar archivo .env.production
ENV_FILE=".env.production"

if [ ! -f "$ENV_FILE" ]; then
    warn "No existe $ENV_FILE"
    cp .env.production.example "$ENV_FILE"
    warn "Template copiado a $ENV_FILE"
    warn "EDITALO con tus valores reales antes de continuar:"
    warn "  - DB_PASSWORD, JWT_SECRET, N8N_PASSWORD"
    warn "  - EVOLUTION_API_KEY, SMTP_USER, SMTP_PASS"
    warn "  - DOMAIN (dejar vacio si solo IP)"
    exit 0
fi

# 4. Validar variables criticas
source "$ENV_FILE"

check_var() {
    local var_name="$1"
    local var_value="${!var_name}"
    if [[ -z "$var_value" || "$var_value" == *"CAMBIAR"* ]]; then
        error "$var_name no configurado correctamente en $ENV_FILE"
        exit 1
    fi
}

check_var "DB_PASSWORD"
check_var "JWT_SECRET"
check_var "N8N_PASSWORD"
check_var "EVOLUTION_API_KEY"

if [[ -z "$SMTP_USER" || -z "$SMTP_PASS" || "$SMTP_PASS" == *"CAMBIAR"* ]]; then
    warn "SMTP_USER/SMTP_PASS no configurados — el envio de emails no funcionara"
fi

info "Variables de entorno verificadas"

# 5. Build Evolution API (si no existe la imagen)
info "Verificando imagen de Evolution API..."
if ! docker image inspect evolution-api-dev:2.3.7 &> /dev/null; then
    warn "Imagen evolution-api-dev:2.3.7 no encontrada"
    warn "Construyendo desde fuente..."
    bash scripts/build-evolution.sh
fi
info "Evolution API image lista"

# 6. Build n8n custom image (si no existe)
if ! docker image inspect docker.n8n.io/n8nio/n8n:latest &> /dev/null; then
    warn "Descargando n8n image..."
    docker pull docker.n8n.io/n8nio/n8n:latest
fi

# 7. Construir y levantar servicios
info "Construyendo imagenes..."
docker compose -f docker-compose.prod.yml --env-file "$ENV_FILE" build

info "Levantando servicios..."
docker compose -f docker-compose.prod.yml --env-file "$ENV_FILE" up -d

# 8. Esperar a que los servicios inicien
info "Esperando a que los servicios inicien..."
sleep 15

# 9. Verificar estado de servicios
info "Estado de los servicios:"
docker compose -f docker-compose.prod.yml ps

# 10. Health check del backend
info "Verificando backend..."
BACKEND_OK=false
for i in 1 2 3 4 5; do
    HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' http://localhost/api/health 2>/dev/null || echo "000")
    if [ "$HTTP_CODE" = "200" ]; then
        info "Backend respondiendo correctamente (HTTP 200)"
        BACKEND_OK=true
        break
    fi
    warn "Intento $i/5 - HTTP $HTTP_CODE, esperando..."
    sleep 5
done

if [ "$BACKEND_OK" = false ]; then
    warn "Backend no responde despues de 5 intentos. Revisa los logs:"
    warn "docker compose -f docker-compose.prod.yml logs backend"
fi

# 11. Verificar frontend
info "Verificando frontend..."
if curl -s -o /dev/null -w '%{http_code}' http://localhost/ 2>/dev/null | grep -q "200\|301\|302"; then
    info "Frontend cargando correctamente"
else
    warn "Frontend no responde. Revisa: docker compose -f docker-compose.prod.yml logs nginx"
fi

# 12. SSL con Let's Encrypt (si DOMAIN está configurado)
if [ -n "$DOMAIN" ]; then
    info "DOMAIN=${DOMAIN} detectado — configurando SSL..."
    
    # Verificar si ya hay certificados
    if [ ! -d "/etc/letsencrypt/live/$DOMAIN" ]; then
        warn "No se encontraron certificados SSL para $DOMAIN"
        warn "Obteniendo certificados de Let's Encrypt..."
        
        docker compose -f docker-compose.prod.yml run --rm certbot certonly \
            --webroot -w /var/www/certbot \
            -d "$DOMAIN" -d "www.$DOMAIN" \
            --non-interactive --agree-tos \
            --email "admin@$DOMAIN" || true
        
        if [ -d "/etc/letsencrypt/live/$DOMAIN" ]; then
            info "Certificados SSL obtenidos para $DOMAIN"
        else
            warn "No se pudieron obtener certificados SSL automaticamente"
            warn "Ejecuta manualmente:"
            warn "  docker compose -f docker-compose.prod.yml run certbot certonly --webroot -w /var/www/certbot -d $DOMAIN"
        fi
    else
        info "Certificados SSL existentes para $DOMAIN"
        info "Programa renovacion automatica con:"
        info "  0 3 * * * docker compose -f /opt/gestion-aulas-uide/docker-compose.prod.yml run certbot renew && docker compose restart nginx"
    fi
    
    # Reiniciar nginx para que cargue la config SSL
    info "Reiniciando nginx para aplicar config SSL..."
    docker compose -f docker-compose.prod.yml restart nginx
fi

echo ""
echo "============================================"
info "Despliegue completado!"
echo "============================================"
echo ""
if [ -n "$DOMAIN" ]; then
    info "Frontend: https://$DOMAIN"
    info "API:      https://$DOMAIN/api/health"
    info "n8n:      https://$DOMAIN/n8n/"
else
    VPS_IP=$(hostname -I | awk '{print $1}')
    info "Frontend: http://$VPS_IP"
    info "API:      http://$VPS_IP/api/health"
    info "n8n:      http://$VPS_IP/n8n/"
fi
info "WhatsApp: Escanea QR: bash scripts/setup-evolution-instance.sh"
echo ""
echo "Comandos utiles:"
echo "  Logs:       docker compose -f docker-compose.prod.yml logs -f"
echo "  Estado:     docker compose -f docker-compose.prod.yml ps"
echo "  Reiniciar:  docker compose -f docker-compose.prod.yml restart"
echo "  Detener:    docker compose -f docker-compose.prod.yml down"
echo "  Actualizar: git pull && docker compose -f docker-compose.prod.yml up -d --build"
