# ============================================
# Script PowerShell: Instalar Lucide React
# ============================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   INSTALANDO DEPENDENCIAS FALTANTES" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Ir al directorio frontend
$frontendPath = Join-Path $PSScriptRoot "frontend"
Set-Location $frontendPath

Write-Host "📂 Directorio: $frontendPath" -ForegroundColor Gray
Write-Host ""

# Instalar lucide-react
Write-Host "📦 Instalando lucide-react..." -ForegroundColor Yellow
npm install lucide-react

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "   ✅ INSTALACIÓN EXITOSA" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Ahora ejecuta:" -ForegroundColor White
    Write-Host "  npm run dev" -ForegroundColor Cyan
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "❌ ERROR en la instalación" -ForegroundColor Red
    Write-Host ""
    Write-Host "Intenta manualmente:" -ForegroundColor Yellow
    Write-Host "  cd frontend" -ForegroundColor Gray
    Write-Host "  npm install lucide-react" -ForegroundColor Gray
    Write-Host "  npm run dev" -ForegroundColor Gray
}
