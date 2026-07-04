#!/bin/bash
# ============================================
# Build Evolution API v2.3.7 desde fuente
# ============================================
# Ejecutar UNA VEZ antes del primer deploy
# Uso: bash scripts/build-evolution.sh
# ============================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
IMAGE_NAME="evolution-api-dev"
IMAGE_TAG="2.3.7"
BUILD_DIR="/tmp/evolution-api-build"

echo "============================================"
echo "  Build Evolution API v${IMAGE_TAG}"
echo "============================================"
echo ""

# 1. Verificar Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker no instalado"
    exit 1
fi
echo "✅ Docker: $(docker --version)"

# 2. Verificar si la imagen ya existe
if docker image inspect "${IMAGE_NAME}:${IMAGE_TAG}" &> /dev/null; then
    echo "✅ La imagen ${IMAGE_NAME}:${IMAGE_TAG} ya existe"
    echo "   Para rebuildear: docker rmi ${IMAGE_NAME}:${IMAGE_TAG}"
    echo "   y ejecuta este script de nuevo"
    exit 0
fi

# 3. Clonar repositorio
echo "📥 Clonando Evolution API v${IMAGE_TAG}..."
if [ -d "$BUILD_DIR" ]; then
    rm -rf "$BUILD_DIR"
fi

git clone --depth 1 --branch v${IMAGE_TAG} \
    https://github.com/EvolutionAPI/evolution-api.git \
    "$BUILD_DIR" 2>&1

echo "✅ Repositorio clonado"

# 4. Construir imagen
echo "🔨 Construyendo imagen Docker..."
cd "$BUILD_DIR"
docker build -t "${IMAGE_NAME}:${IMAGE_TAG}" . 2>&1
echo "✅ Imagen ${IMAGE_NAME}:${IMAGE_TAG} construida"

# 5. Limpiar
cd "$PROJECT_DIR"
rm -rf "$BUILD_DIR"
echo "🧹 Limpieza completada"

# 6. Verificar
if docker image inspect "${IMAGE_NAME}:${IMAGE_TAG}" &> /dev/null; then
    echo ""
    echo "============================================"
    echo "  ✅ Build exitoso"
    echo "  Imagen: ${IMAGE_NAME}:${IMAGE_TAG}"
    echo "============================================"
    echo ""
    echo "  Ahora puedes ejecutar el deploy:"
    echo "  ./deploy.sh"
else
    echo "❌ Error: la imagen no se encontró después del build"
    exit 1
fi
