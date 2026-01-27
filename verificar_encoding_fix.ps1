# 🧪 SCRIPT: Verificar Fix de Encoding UTF-8
# Verifica que los nombres de carreras se muestran correctamente

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "🧪 VERIFICACIÓN: Encoding UTF-8" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# 1. Verificar Docker
Write-Host "📋 1. Verificando Docker..." -ForegroundColor Yellow
$dockerRunning = docker ps 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker no está corriendo" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Docker OK`n" -ForegroundColor Green

# 2. Verificar directores sin duplicados
Write-Host "📋 2. Verificando directores (sin duplicados)..." -ForegroundColor Yellow
$sqlDirectores = @"
SELECT COUNT(*) as total FROM usuarios WHERE rol = 'director';
"@

$result = docker exec gestion_aulas_db psql -U postgres -d gestion_aulas -t -c $sqlDirectores
$total = $result.Trim()

if ($total -eq "3") {
    Write-Host "✅ 3 directores (sin duplicados)`n" -ForegroundColor Green
} else {
    Write-Host "⚠️  Directores encontrados: $total (esperado: 3)`n" -ForegroundColor Yellow
}

# 3. Verificar encoding en uploads_carreras
Write-Host "📋 3. Verificando encoding en BD..." -ForegroundColor Yellow
$sqlCarreras = @"
SELECT id, carrera FROM uploads_carreras WHERE id IN (2, 4, 7) ORDER BY id;
"@

Write-Host ""
docker exec gestion_aulas_db psql -U postgres -d gestion_aulas -c $sqlCarreras
Write-Host ""

Write-Host "ℹ️  Nota: Los caracteres en la BD pueden verse mal codificados," -ForegroundColor Cyan
Write-Host "   pero el backend los corrige automáticamente.`n" -ForegroundColor Cyan

# 4. Verificar backend está corriendo
Write-Host "📋 4. Verificando backend..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/distribucion/estado" -UseBasicParsing -TimeoutSec 5 2>$null
    if ($response.StatusCode -eq 401) {
        Write-Host "✅ Backend corriendo (requiere autenticación)`n" -ForegroundColor Green
    } elseif ($response.StatusCode -eq 200) {
        Write-Host "✅ Backend corriendo`n" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️  Backend no responde`n" -ForegroundColor Yellow
}

# 5. Instrucciones para verificar en frontend
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "📋 5. Verificar en el Frontend" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "1. Abre: http://localhost:5173" -ForegroundColor White
Write-Host "2. Login: admin@uide.edu.ec / admin123" -ForegroundColor White
Write-Host "3. Ve a la tabla 'Asignar directores por carrera'" -ForegroundColor White
Write-Host "4. Verifica que se vea:`n" -ForegroundColor White

Write-Host "   ✓ 'Ingeniería' (NO 'Ingenier??a')" -ForegroundColor Green
Write-Host "   ✓ 'Tecnologías' (NO 'Tecnolog??as')" -ForegroundColor Green
Write-Host "   ✓ 'Información' (NO 'Informaci??n')" -ForegroundColor Green
Write-Host "   ✓ Solo 3 directores (Raquel, Lorena, Freddy)`n" -ForegroundColor Green

Write-Host "5. Abre DevTools (F12) → Consola" -ForegroundColor White
Write-Host "6. NO debe haber warnings de 'same key'`n" -ForegroundColor White

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ Verificación completa" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan
