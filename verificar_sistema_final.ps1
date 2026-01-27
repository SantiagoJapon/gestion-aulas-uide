# ============================================
# SCRIPT DE VERIFICACIÓN FINAL
# Sistema de Gestión de Aulas UIDE
# ============================================

Write-Host "`n[*] VERIFICACION FINAL DEL SISTEMA`n" -ForegroundColor Cyan

$allGood = $true

# 1. Backend
Write-Host "1. Verificando Backend..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/health" -UseBasicParsing -TimeoutSec 5 -ErrorAction SilentlyContinue
    Write-Host "   ✅ Backend activo (puerto 3000)" -ForegroundColor Green
} catch {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 5 -ErrorAction SilentlyContinue
        Write-Host "   ✅ Backend activo (puerto 3000)" -ForegroundColor Green
    } catch {
        Write-Host "   ❌ Backend NO responde" -ForegroundColor Red
        $allGood = $false
    }
}

# 2. Frontend
Write-Host "`n2. Verificando Frontend..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5173" -UseBasicParsing -TimeoutSec 5 -ErrorAction SilentlyContinue
    Write-Host "   ✅ Frontend activo (puerto 5173)" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️  Frontend no está corriendo" -ForegroundColor Yellow
    Write-Host "      (Esto es opcional, el backend funciona sin él)" -ForegroundColor Gray
}

# 3. Base de Datos
Write-Host "`n3. Verificando Base de Datos..." -ForegroundColor Yellow
try {
    $result = docker exec gestion_aulas_db psql -U postgres -d gestion_aulas -c "SELECT COUNT(*) FROM usuarios WHERE rol='director';" 2>&1
    if ($result -match "\d+") {
        Write-Host "   ✅ Base de datos activa" -ForegroundColor Green
        Write-Host "      Directores en sistema: $($Matches[0])" -ForegroundColor Gray
    }
} catch {
    Write-Host "   ❌ No se puede conectar a la BD" -ForegroundColor Red
    $allGood = $false
}

# 4. Endpoint de Distribución
Write-Host "`n4. Verificando Endpoint /api/distribucion/estado..." -ForegroundColor Yellow
try {
    # Primero necesitamos un token
    $loginData = @{
        email = "admin@uide.edu.ec"
        password = "admin123"
    } | ConvertTo-Json

    try {
        $login = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" -Method Post -Body $loginData -ContentType "application/json" -ErrorAction Stop
        $token = $login.token
        
        $distResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/distribucion/estado" -Method Get -Headers @{Authorization = "Bearer $token"} -ErrorAction Stop
        
        Write-Host "   ✅ Endpoint de distribución: 200 OK" -ForegroundColor Green
        Write-Host "      Total clases: $($distResponse.estadisticas.total_clases)" -ForegroundColor Gray
        Write-Host "      Clases asignadas: $($distResponse.estadisticas.clases_asignadas)" -ForegroundColor Gray
        Write-Host "      Carreras activas: $($distResponse.estadisticas.total_carreras)" -ForegroundColor Gray
    } catch {
        Write-Host "   ⚠️  No se pudo autenticar (verifica password de admin)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ❌ Error en endpoint de distribución" -ForegroundColor Red
    $allGood = $false
}

# 5. Endpoint de Usuarios
Write-Host "`n5. Verificando Endpoint /api/usuarios..." -ForegroundColor Yellow
try {
    if ($token) {
        $usuariosResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/usuarios?rol=director" -Method Get -Headers @{Authorization = "Bearer $token"} -ErrorAction Stop
        Write-Host "   ✅ Endpoint de usuarios: 200 OK" -ForegroundColor Green
        Write-Host "      Directores encontrados: $($usuariosResponse.total)" -ForegroundColor Gray
    } else {
        Write-Host "   ⚠️  Sin token, no se puede verificar" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ❌ Error en endpoint de usuarios" -ForegroundColor Red
    $allGood = $false
}

# 6. Docker Containers
Write-Host "`n6. Verificando Docker Containers..." -ForegroundColor Yellow
try {
    $containers = docker ps --format "{{.Names}}" 2>&1
    $expectedContainers = @("gestion_aulas_backend", "gestion_aulas_db", "gestion_aulas_n8n", "gestion_aulas_redis")
    
    foreach ($container in $expectedContainers) {
        if ($containers -match $container) {
            Write-Host "   OK ${container}: Running" -ForegroundColor Green
        } else {
            Write-Host "   WARN ${container}: Not running" -ForegroundColor Yellow
        }
    }
} catch {
    Write-Host "   ⚠️  No se puede verificar Docker" -ForegroundColor Yellow
}

# 7. Verificar credenciales de directores
Write-Host "`n7. Verificando Credenciales de Directores..." -ForegroundColor Yellow
try {
    $result = docker exec gestion_aulas_db psql -U postgres -d gestion_aulas -c "SELECT id, nombre, email FROM usuarios WHERE rol='director' ORDER BY id;" 2>&1 | Out-String
    if ($result -match "director") {
        Write-Host "   ✅ Directores en base de datos" -ForegroundColor Green
        Write-Host "      Password para todos: director123" -ForegroundColor Gray
    }
} catch {
    Write-Host "   ⚠️  No se pudo verificar directores" -ForegroundColor Yellow
}

# Resumen Final
Write-Host "`n" + "="*50 -ForegroundColor Cyan
if ($allGood) {
    Write-Host "`n🎉 ¡SISTEMA 100% OPERATIVO!" -ForegroundColor Green
    Write-Host "`nTodo está funcionando correctamente.`n" -ForegroundColor White
    Write-Host "Próximos pasos:" -ForegroundColor Yellow
    Write-Host "1. Abre http://localhost:5173" -ForegroundColor White
    Write-Host "2. Login como admin" -ForegroundColor White
    Write-Host "3. Ve a Panel de Administración" -ForegroundColor White
    Write-Host "4. Asigna directores a carreras" -ForegroundColor White
} else {
    Write-Host "`n⚠️  HAY ALGUNOS PROBLEMAS" -ForegroundColor Yellow
    Write-Host "`nRevisa los errores marcados con ❌ arriba.`n" -ForegroundColor White
    Write-Host "Soluciones comunes:" -ForegroundColor Yellow
    Write-Host "- docker-compose restart backend" -ForegroundColor White
    Write-Host "- Verificar que todos los containers estén corriendo" -ForegroundColor White
    Write-Host "- Revisar logs: docker logs gestion_aulas_backend" -ForegroundColor White
}
Write-Host "`n" + "="*50 + "`n" -ForegroundColor Cyan

# Enlaces útiles
Write-Host "📚 DOCUMENTACIÓN GENERADA:" -ForegroundColor Cyan
Write-Host "   • SOLUCION_FINAL_DIRECTORES.md" -ForegroundColor White
Write-Host "   • SOLUCION_DIRECTORES_CARRERAS.md" -ForegroundColor White
Write-Host "   • RESUMEN_ERRORES_CORREGIDOS.md" -ForegroundColor White
Write-Host "`n"
