# =====================================================
# Script de Verificación de Servicios
# Sistema de Gestión de Aulas UIDE
# =====================================================

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "🔍 VERIFICANDO SERVICIOS" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# 1. Verificar contenedores Docker
Write-Host "📦 Contenedores Docker:" -ForegroundColor Yellow
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | Select-String -Pattern "gestion_aulas"

Write-Host "`n"

# 2. Verificar Backend (puerto 3000)
Write-Host "🔧 Backend (Puerto 3000):" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/aulas" -Method GET -TimeoutSec 5 -UseBasicParsing 2>&1
    if ($response.StatusCode -eq 200) {
        Write-Host "  ✅ Backend respondiendo correctamente" -ForegroundColor Green
        
        # Verificar CORS
        $corsHeader = $response.Headers.'Access-Control-Allow-Origin'
        if ($corsHeader) {
            Write-Host "  ✅ CORS configurado: $corsHeader" -ForegroundColor Green
        } else {
            Write-Host "  ⚠️  CORS no detectado en la respuesta" -ForegroundColor Yellow
        }
    }
} catch {
    Write-Host "  ❌ Backend no responde: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n"

# 3. Verificar PostgreSQL (puerto 5433)
Write-Host "🗄️  PostgreSQL (Puerto 5433):" -ForegroundColor Yellow
try {
    $pgTest = docker exec gestion_aulas_db psql -U postgres -d gestion_aulas -c "SELECT 1;" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✅ PostgreSQL funcionando" -ForegroundColor Green
    } else {
        Write-Host "  ❌ Error en PostgreSQL" -ForegroundColor Red
    }
} catch {
    Write-Host "  ❌ No se pudo conectar a PostgreSQL" -ForegroundColor Red
}

Write-Host "`n"

# 4. Verificar n8n (puerto 5678)
Write-Host "🔄 n8n (Puerto 5678):" -ForegroundColor Yellow
try {
    $n8nResponse = Invoke-WebRequest -Uri "http://localhost:5678" -Method GET -TimeoutSec 5 -UseBasicParsing 2>&1
    if ($n8nResponse.StatusCode -eq 200) {
        Write-Host "  ✅ n8n corriendo" -ForegroundColor Green
        Write-Host "     Abrir: http://localhost:5678" -ForegroundColor Cyan
    }
} catch {
    Write-Host "  ⚠️  n8n no responde (normal si no está configurado)" -ForegroundColor Yellow
}

Write-Host "`n"

# 5. Verificar Frontend (puerto 5173)
Write-Host "🌐 Frontend (Puerto 5173):" -ForegroundColor Yellow
try {
    $frontendResponse = Invoke-WebRequest -Uri "http://localhost:5173" -Method GET -TimeoutSec 5 -UseBasicParsing 2>&1
    if ($frontendResponse.StatusCode -eq 200) {
        Write-Host "  ✅ Frontend corriendo" -ForegroundColor Green
        Write-Host "     Abrir: http://localhost:5173" -ForegroundColor Cyan
    }
} catch {
    Write-Host "  ⚠️  Frontend no responde" -ForegroundColor Yellow
    Write-Host "     Ejecutar: cd frontend && npm run dev" -ForegroundColor Cyan
}

Write-Host "`n"

# 6. Probar Endpoints Clave
Write-Host "🔌 Endpoints del Backend:" -ForegroundColor Yellow

$endpoints = @(
    @{Url="http://localhost:3000/api/aulas"; Nombre="Listar Aulas"},
    @{Url="http://localhost:3000/api/aulas/stats/summary"; Nombre="Estadísticas Aulas"},
    @{Url="http://localhost:3000/api/carreras?includeInactive=true"; Nombre="Listar Carreras"; RequireAuth=$true}
)

foreach ($endpoint in $endpoints) {
    try {
        if ($endpoint.RequireAuth) {
            Write-Host "  ⚠️  $($endpoint.Nombre): Requiere autenticación" -ForegroundColor Yellow
        } else {
            $testResponse = Invoke-WebRequest -Uri $endpoint.Url -Method GET -TimeoutSec 5 -UseBasicParsing 2>&1
            if ($testResponse.StatusCode -eq 200) {
                Write-Host "  ✅ $($endpoint.Nombre)" -ForegroundColor Green
            }
        }
    } catch {
        Write-Host "  ❌ $($endpoint.Nombre): Error" -ForegroundColor Red
    }
}

Write-Host "`n"

# 7. Contar registros en BD
Write-Host "📊 Datos en Base de Datos:" -ForegroundColor Yellow
try {
    # Aulas
    $aulasCount = docker exec gestion_aulas_db psql -U postgres -d gestion_aulas -t -c "SELECT COUNT(*) FROM aulas;" 2>&1
    Write-Host "  📌 Aulas: $($aulasCount.Trim())" -ForegroundColor Cyan
    
    # Carreras
    $carrerasCount = docker exec gestion_aulas_db psql -U postgres -d gestion_aulas -t -c "SELECT COUNT(*) FROM uploads_carreras;" 2>&1
    Write-Host "  -> Carreras: $($carrerasCount.Trim())" -ForegroundColor Cyan
    
    # Estudiantes
    $estudiantesCount = docker exec gestion_aulas_db psql -U postgres -d gestion_aulas -t -c "SELECT COUNT(*) FROM estudiantes;" 2>&1
    Write-Host "  -> Estudiantes: $($estudiantesCount.Trim())" -ForegroundColor Cyan
    
    # Usuarios
    $usuariosCount = docker exec gestion_aulas_db psql -U postgres -d gestion_aulas -t -c "SELECT COUNT(*) FROM usuarios;" 2>&1
    Write-Host "  -> Usuarios: $($usuariosCount.Trim())" -ForegroundColor Cyan
    
} catch {
    Write-Host "  ❌ Error al consultar base de datos" -ForegroundColor Red
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "✅ VERIFICACIÓN COMPLETA" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "💡 Siguientes pasos:" -ForegroundColor Yellow
Write-Host "   1. Si todo está ✅, refrescar el navegador (Ctrl + F5)" -ForegroundColor White
Write-Host "   2. Login en: http://localhost:5173/login" -ForegroundColor White
Write-Host "   3. Ir al Panel de Admin" -ForegroundColor White
Write-Host "   4. Probar funcionalidades" -ForegroundColor White
Write-Host ""
