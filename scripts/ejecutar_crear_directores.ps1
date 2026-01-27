# ============================================
# Script PowerShell: Crear Directores de Carrera
# ============================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   CREAR DIRECTORES DE CARRERA - UIDE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Configuración de conexión PostgreSQL
$DB_HOST = "localhost"
$DB_PORT = "5432"
$DB_NAME = "gestion_aulas"
$DB_USER = "postgres"
$DB_PASSWORD = "postgres"

Write-Host "Configuración de conexión:" -ForegroundColor Yellow
Write-Host "  Host: $DB_HOST" -ForegroundColor Gray
Write-Host "  Puerto: $DB_PORT" -ForegroundColor Gray
Write-Host "  Base de datos: $DB_NAME" -ForegroundColor Gray
Write-Host "  Usuario: $DB_USER" -ForegroundColor Gray
Write-Host ""

# Ruta del script SQL
$SQL_FILE = Join-Path $PSScriptRoot "crear_directores_carreras.sql"

if (-not (Test-Path $SQL_FILE)) {
    Write-Host "❌ ERROR: No se encontró el archivo SQL en:" -ForegroundColor Red
    Write-Host "   $SQL_FILE" -ForegroundColor Red
    exit 1
}

Write-Host "✓ Archivo SQL encontrado" -ForegroundColor Green
Write-Host ""

# Ejecutar script SQL usando psql
Write-Host "Ejecutando script SQL..." -ForegroundColor Yellow
Write-Host ""

$env:PGPASSWORD = $DB_PASSWORD

try {
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f $SQL_FILE

    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "   ✓ DIRECTORES CREADOS EXITOSAMENTE" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "CREDENCIALES DE ACCESO:" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Password para TODOS: uide2024" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "DIRECTORES CREADOS:" -ForegroundColor White
        Write-Host "1. raquel.veintimilla@uide.edu.ec - Derecho" -ForegroundColor Gray
        Write-Host "2. lorena.conde@uide.edu.ec - Informática" -ForegroundColor Gray
        Write-Host "3. freddy.salazar@uide.edu.ec - Arquitectura" -ForegroundColor Gray
        Write-Host "4. domenica.burneo@uide.edu.ec - Psicología" -ForegroundColor Gray
        Write-Host "5. franklin.chacon@uide.edu.ec - Business" -ForegroundColor Gray
        Write-Host "6. mercy.namicela@uide.edu.ec - Business (Coordinadora)" -ForegroundColor Gray
        Write-Host ""
    } else {
        Write-Host ""
        Write-Host "❌ ERROR: Falló la ejecución del script SQL" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host ""
    Write-Host "❌ ERROR: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
} finally {
    Remove-Item Env:\PGPASSWORD
}
