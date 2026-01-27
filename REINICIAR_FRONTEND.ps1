# ============================================
# Script PowerShell: Reiniciar Frontend
# ============================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   REINICIANDO FRONTEND VITE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Ir al directorio frontend
$frontendPath = Join-Path $PSScriptRoot "frontend"

if (-not (Test-Path $frontendPath)) {
    Write-Host "❌ ERROR: No se encontró el directorio frontend" -ForegroundColor Red
    exit 1
}

Set-Location $frontendPath

Write-Host "📂 Directorio: $frontendPath" -ForegroundColor Gray
Write-Host ""

# Matar procesos en puerto 5173
Write-Host "🔄 Liberando puerto 5173..." -ForegroundColor Yellow
try {
    $process = Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
    if ($process) {
        Stop-Process -Id $process -Force -ErrorAction SilentlyContinue
        Write-Host "✓ Puerto 5173 liberado" -ForegroundColor Green
    } else {
        Write-Host "✓ Puerto 5173 ya está libre" -ForegroundColor Green
    }
} catch {
    Write-Host "✓ Puerto 5173 está libre" -ForegroundColor Green
}

Start-Sleep -Seconds 1
Write-Host ""

# Verificar node_modules
Write-Host "📦 Verificando dependencias..." -ForegroundColor Yellow
if (-not (Test-Path "node_modules")) {
    Write-Host "⚠️  No se encontró node_modules, instalando..." -ForegroundColor Yellow
    npm install
    Write-Host ""
}

# Iniciar servidor
Write-Host "========================================" -ForegroundColor Green
Write-Host "   🚀 INICIANDO SERVIDOR FRONTEND" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "El servidor se iniciará en:" -ForegroundColor White
Write-Host "  ➜  http://localhost:5173" -ForegroundColor Cyan
Write-Host ""
Write-Host "Para detener el servidor: Ctrl + C" -ForegroundColor Gray
Write-Host ""

# Iniciar npm run dev
npm run dev
