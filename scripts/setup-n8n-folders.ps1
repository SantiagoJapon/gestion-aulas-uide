# Script PowerShell para crear carpetas necesarias en el contenedor de n8n

Write-Host "📁 Creando carpetas en el contenedor de n8n..." -ForegroundColor Cyan

docker-compose exec n8n mkdir -p /tmp/uploads
docker-compose exec n8n mkdir -p /tmp/reportes
docker-compose exec n8n mkdir -p /tmp/estudiantes

Write-Host "✅ Carpetas creadas:" -ForegroundColor Green
Write-Host "   - /tmp/uploads"
Write-Host "   - /tmp/reportes"
Write-Host "   - /tmp/estudiantes"







