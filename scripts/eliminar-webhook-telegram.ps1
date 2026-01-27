# Script para eliminar webhook de Telegram
# Uso: .\scripts\eliminar-webhook-telegram.ps1

$TELEGRAM_BOT_TOKEN = "8524499239:AAEgU7QiBZMwJ1YPErkHVGJ23CT5IzWUMGw"

Write-Host "🔧 Eliminando webhook de Telegram..." -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod -Uri "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/deleteWebhook" -Method Post
    
    if ($response.ok) {
        Write-Host "✅ Webhook eliminado correctamente" -ForegroundColor Green
        Write-Host "Resultado: $($response.description)" -ForegroundColor Gray
    } else {
        Write-Host "⚠️ Respuesta: $($response.description)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Error al eliminar webhook: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "📋 Verificar estado del webhook:" -ForegroundColor Cyan
Write-Host "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getWebhookInfo" -ForegroundColor Gray













