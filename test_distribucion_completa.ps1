# ============================================
# TEST COMPLETO - Distribución Automática
# ============================================

Write-Host "🧪 TEST COMPLETO - Distribución Automática" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Verificar servicios
Write-Host "1️⃣ Verificando servicios..." -ForegroundColor Yellow
Write-Host ""

$backendOk = $false
$n8nOk = $false
$dbOk = $false

# Backend
try {
    $null = Invoke-WebRequest -Uri "http://localhost:3000/api/aulas" -UseBasicParsing -TimeoutSec 5
    Write-Host "✅ Backend corriendo" -ForegroundColor Green
    $backendOk = $true
} catch {
    Write-Host "❌ Backend NO responde" -ForegroundColor Red
}

# N8N
try {
    $null = Invoke-WebRequest -Uri "http://localhost:5678" -UseBasicParsing -TimeoutSec 5
    Write-Host "✅ n8n corriendo" -ForegroundColor Green
    $n8nOk = $true
} catch {
    Write-Host "❌ n8n NO responde" -ForegroundColor Red
}

# PostgreSQL
try {
    $null = docker exec gestion_aulas_db psql -U postgres -d gestion_aulas -c "SELECT 1" 2>&1
    Write-Host "✅ PostgreSQL corriendo" -ForegroundColor Green
    $dbOk = $true
} catch {
    Write-Host "❌ PostgreSQL NO responde" -ForegroundColor Red
}

Write-Host ""

if (-not $backendOk -or -not $dbOk) {
    Write-Host "❌ Servicios críticos no están corriendo" -ForegroundColor Red
    exit 1
}

# 2. Login y obtener token
Write-Host "2️⃣ Obteniendo token de autenticación..." -ForegroundColor Yellow
Write-Host ""

$loginBody = @{
    email = "admin@uide.edu.ec"
    password = "admin123"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body $loginBody

    $token = $loginResponse.token

    if ($token) {
        Write-Host "✅ Token obtenido: $($token.Substring(0, 20))..." -ForegroundColor Green
    } else {
        Write-Host "❌ No se pudo obtener token" -ForegroundColor Red
        Write-Host "   Verifica: email=admin@uide.edu.ec password=admin123" -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-Host "❌ Error al hacer login: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""

# 3. Verificar aulas disponibles
Write-Host "3️⃣ Verificando aulas disponibles..." -ForegroundColor Yellow
Write-Host ""

$aulasCount = docker exec gestion_aulas_db psql -U postgres -d gestion_aulas -t -c "SELECT COUNT(*) FROM aulas WHERE estado = 'disponible';" 2>&1 | Select-Object -First 1

$aulasCount = $aulasCount.Trim()

Write-Host "   Aulas disponibles: $aulasCount" -ForegroundColor White

if ($aulasCount -eq "0") {
    Write-Host "❌ No hay aulas disponibles" -ForegroundColor Red
    Write-Host "   Crea algunas aulas primero" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Hay aulas disponibles" -ForegroundColor Green
Write-Host ""

# 4. Verificar si existe el Excel de prueba
Write-Host "4️⃣ Verificando archivo de prueba..." -ForegroundColor Yellow
Write-Host ""

$excelFile = "planificacion_PRUEBA_RAPIDA.xlsx"

if (-not (Test-Path $excelFile)) {
    Write-Host "⚠️  No se encuentra $excelFile" -ForegroundColor Yellow
    Write-Host "   Créalo o usa otro Excel de planificación" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   Columnas requeridas:" -ForegroundColor White
    Write-Host "   - codigo_materia" -ForegroundColor Gray
    Write-Host "   - nombre_materia" -ForegroundColor Gray
    Write-Host "   - nivel" -ForegroundColor Gray
    Write-Host "   - paralelo" -ForegroundColor Gray
    Write-Host "   - numero_estudiantes" -ForegroundColor Gray
    Write-Host "   - horario_dia" -ForegroundColor Gray
    Write-Host "   - horario_inicio" -ForegroundColor Gray
    Write-Host "   - horario_fin" -ForegroundColor Gray
    Write-Host "   - docente" -ForegroundColor Gray
    Write-Host ""
    exit 1
}

Write-Host "✅ Archivo encontrado: $excelFile" -ForegroundColor Green
Write-Host ""

# 5. Subir planificación
Write-Host "5️⃣ Subiendo planificación..." -ForegroundColor Yellow
Write-Host ""

try {
    $boundary = [System.Guid]::NewGuid().ToString()
    $filePath = (Resolve-Path $excelFile).Path
    $fileBytes = [System.IO.File]::ReadAllBytes($filePath)
    $fileContent = [System.Text.Encoding]::GetEncoding("iso-8859-1").GetString($fileBytes)

    $bodyLines = @(
        "--$boundary",
        "Content-Disposition: form-data; name=`"archivo`"; filename=`"$excelFile`"",
        "Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "",
        $fileContent,
        "--$boundary",
        "Content-Disposition: form-data; name=`"carrera_id`"",
        "",
        "1",
        "--$boundary--"
    )

    $body = $bodyLines -join "`r`n"

    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/planificaciones/subir" `
        -Method POST `
        -Headers @{
            "Authorization" = "Bearer $token"
        } `
        -ContentType "multipart/form-data; boundary=$boundary" `
        -Body $body

    Write-Host "Respuesta del servidor:" -ForegroundColor White
    $response | ConvertTo-Json -Depth 5
    Write-Host ""

    if ($response.success) {
        Write-Host "✅ Planificación subida exitosamente" -ForegroundColor Green
        Write-Host "   Clases guardadas: $($response.resultado.clases_guardadas)" -ForegroundColor White

        if ($response.resultado.distribucion.estado -eq "en_progreso") {
            Write-Host "🤖 Distribución automática en progreso..." -ForegroundColor Cyan
        } else {
            Write-Host "⚠️  Distribución debe ejecutarse manualmente" -ForegroundColor Yellow
            Write-Host "   (N8N workflow no está activo)" -ForegroundColor Gray
        }
    } else {
        Write-Host "❌ Error al subir planificación" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
}

Write-Host ""

# 6. Consultar estado de distribución
Write-Host "6️⃣ Consultando estado de distribución..." -ForegroundColor Yellow
Write-Host ""
Start-Sleep -Seconds 3

try {
    $estado = Invoke-RestMethod -Uri "http://localhost:3000/api/planificaciones/distribucion/1" `
        -Method GET `
        -Headers @{
            "Authorization" = "Bearer $token"
        }

    Write-Host "Estadísticas:" -ForegroundColor White
    Write-Host "   Total clases:    $($estado.estadisticas.total)" -ForegroundColor White
    Write-Host "   Asignadas:       $($estado.estadisticas.asignadas)" -ForegroundColor Green
    Write-Host "   Pendientes:      $($estado.estadisticas.pendientes)" -ForegroundColor Yellow
    Write-Host "   Porcentaje:      $($estado.estadisticas.porcentaje)%" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Error al consultar estado: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "✅ Test completado" -ForegroundColor Green
Write-Host ""
Write-Host "📊 PRÓXIMOS PASOS:" -ForegroundColor Yellow
Write-Host "   1. Revisa los resultados arriba" -ForegroundColor White
Write-Host "   2. Si la distribución no es automática:" -ForegroundColor White
Write-Host "      - Ve a http://localhost:5678" -ForegroundColor Gray
Write-Host "      - Importa workflow_maestro_FINAL.json" -ForegroundColor Gray
Write-Host "      - Actívalo" -ForegroundColor Gray
Write-Host "      - Vuelve a ejecutar este script" -ForegroundColor Gray
Write-Host ""
