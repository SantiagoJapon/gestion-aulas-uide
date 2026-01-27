#!/bin/bash
# Script para crear carpetas necesarias en el contenedor de n8n

echo "📁 Creando carpetas en el contenedor de n8n..."

docker-compose exec n8n mkdir -p /tmp/uploads
docker-compose exec n8n mkdir -p /tmp/reportes
docker-compose exec n8n mkdir -p /tmp/estudiantes

echo "✅ Carpetas creadas:"
echo "   - /tmp/uploads"
echo "   - /tmp/reportes"
echo "   - /tmp/estudiantes"







