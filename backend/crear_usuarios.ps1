# ============================================
# Script PowerShell: Crear Usuarios y Directores
# ============================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   CREAR USUARIOS Y DIRECTORES - UIDE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$scriptPath = Join-Path $PSScriptRoot "scripts\crear_usuarios_directos.js"

if (-not (Test-Path $scriptPath)) {
    Write-Host "❌ ERROR: No se encontró el script en:" -ForegroundColor Red
    Write-Host "   $scriptPath" -ForegroundColor Red
    exit 1
}

Write-Host "Ejecutando script de creación..." -ForegroundColor Yellow
Write-Host ""

try {
    node $scriptPath

    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "   ✅ ¡TODO LISTO PARA USAR!" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Ahora puedes hacer login con:" -ForegroundColor White
        Write-Host ""
        Write-Host "ADMIN:" -ForegroundColor Cyan
        Write-Host "  Email: admin@uide.edu.ec" -ForegroundColor Gray
        Write-Host "  Password: admin123" -ForegroundColor Gray
        Write-Host ""
        Write-Host "DIRECTORES (password: uide2024):" -ForegroundColor Cyan
        Write-Host "  - raquel.veintimilla@uide.edu.ec" -ForegroundColor Gray
        Write-Host "  - lorena.conde@uide.edu.ec" -ForegroundColor Gray
        Write-Host "  - freddy.salazar@uide.edu.ec" -ForegroundColor Gray
        Write-Host "  - domenica.burneo@uide.edu.ec" -ForegroundColor Gray
        Write-Host "  - franklin.chacon@uide.edu.ec" -ForegroundColor Gray
        Write-Host "  - mercy.namicela@uide.edu.ec" -ForegroundColor Gray
        Write-Host ""
    }
} catch {
    Write-Host ""
    Write-Host "❌ ERROR: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
