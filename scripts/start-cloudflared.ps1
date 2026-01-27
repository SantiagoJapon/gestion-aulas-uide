# Script PowerShell para iniciar Cloudflared en Windows
# Uso: .\scripts\start-cloudflared.ps1

Write-Host "🌐 Iniciando túnel Cloudflared para n8n..." -ForegroundColor Cyan

# Verificar que n8n esté corriendo
$n8nStatus = docker-compose ps n8n 2>&1
if ($n8nStatus -notmatch "Up") {
    Write-Host "❌ Error: n8n no está corriendo. Ejecuta primero: docker-compose up -d" -ForegroundColor Red
    exit 1
}

Write-Host "✅ n8n está corriendo" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Instrucciones:" -ForegroundColor Yellow
Write-Host "1. Copia la URL HTTPS que aparece abajo" -ForegroundColor White
Write-Host "2. Actualiza WEBHOOK_URL en tu archivo .env" -ForegroundColor White
Write-Host "3. Reinicia n8n: docker-compose restart n8n" -ForegroundColor White
Write-Host "4. NO CIERRES esta ventana mientras uses Telegram" -ForegroundColor Yellow
Write-Host ""
Write-Host "Presiona CTRL+C para detener el túnel" -ForegroundColor Gray
Write-Host ""

# Iniciar Cloudflared
cloudflared tunnel --url http://localhost:5678














