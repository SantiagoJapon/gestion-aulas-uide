# 🧪 SCRIPT: Verificar Carreras de Directores
# Verifica que todos los directores tengan sus carreras correctamente asignadas

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "🧪 VERIFICACIÓN: Carreras de Directores" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Verificar que Docker esté corriendo
Write-Host "📋 1. Verificando Docker..." -ForegroundColor Yellow
$dockerRunning = docker ps 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker no está corriendo. Inicia Docker Desktop." -ForegroundColor Red
    exit 1
}
Write-Host "✅ Docker corriendo`n" -ForegroundColor Green

# Verificar base de datos
Write-Host "📋 2. Verificando directores en la base de datos..." -ForegroundColor Yellow
Write-Host ""

$sqlQuery = @"
SELECT 
  u.id, 
  u.nombre || ' ' || u.apellido as nombre_completo,
  u.email, 
  u.carrera_director,
  uc.id as carrera_id,
  uc.carrera as carrera_en_uploads,
  CASE 
    WHEN uc.id IS NOT NULL THEN 'OK'
    ELSE 'ERROR'
  END as estado
FROM usuarios u
LEFT JOIN uploads_carreras uc ON uc.carrera = u.carrera_director
WHERE u.rol = 'director'
ORDER BY u.id;
"@

$result = docker exec gestion_aulas_db psql -U postgres -d gestion_aulas -c $sqlQuery

Write-Host $result
Write-Host ""

# Verificar que todos tengan MATCH
$errores = $result | Select-String -Pattern "ERROR" -Quiet
if ($errores) {
    Write-Host "❌ ALGUNOS DIRECTORES NO TIENEN CARRERA ASIGNADA CORRECTAMENTE" -ForegroundColor Red
    Write-Host ""
    Write-Host "🔧 Ejecuta el script de corrección:" -ForegroundColor Yellow
    Write-Host "   docker exec gestion_aulas_db psql -U postgres -d gestion_aulas < fix_carreras_directores.sql" -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host "✅ TODOS LOS DIRECTORES TIENEN CARRERAS CORRECTAMENTE ASIGNADAS`n" -ForegroundColor Green

# Verificar credenciales
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "📋 3. Credenciales de Directores" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "🔐 Credenciales para login:`n" -ForegroundColor Yellow

$credenciales = @(
    @{Nombre="Raquel Veintimilla"; Email="raquel.veintimilla.director@uide.edu.ec"; Carrera="Derecho"},
    @{Nombre="Lorena Conde"; Email="lorena.conde.director@uide.edu.ec"; Carrera="Informática"},
    @{Nombre="Freddy Salazar"; Email="freddy.salazar.director@uide.edu.ec"; Carrera="Arquitectura"}
)

foreach ($cred in $credenciales) {
    Write-Host "👤 $($cred.Nombre) ($($cred.Carrera))" -ForegroundColor White
    Write-Host "   Email:    $($cred.Email)" -ForegroundColor Gray
    Write-Host "   Password: DirectorUide2026!`n" -ForegroundColor Gray
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "📋 4. Siguiente paso: Probar en el navegador" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "1. Abre: http://localhost:5173" -ForegroundColor White
Write-Host "2. Haz login con cada director" -ForegroundColor White
Write-Host "3. Verifica que vean su 'Carrera habilitada'`n" -ForegroundColor White

Write-Host "✅ Verificación completa. Sistema OK.`n" -ForegroundColor Green
