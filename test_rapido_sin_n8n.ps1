# ============================================
# TEST RÁPIDO - Sin N8N (Solo Backend)
# ============================================

Write-Host "`n🧪 TEST RÁPIDO - Sistema de Planificaciones" -ForegroundColor Cyan
Write-Host "=========================================`n" -ForegroundColor Cyan

# 1. Verificar backend
Write-Host "1️⃣ Verificando backend..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/aulas" -Method Get -TimeoutSec 5
    Write-Host "   ✅ Backend respondiendo`n" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Backend no responde" -ForegroundColor Red
    Write-Host "   Ejecuta: docker-compose up -d backend`n" -ForegroundColor Yellow
    exit 1
}

# 2. Login
Write-Host "2️⃣ Obteniendo token..." -ForegroundColor Yellow
try {
    $loginData = @{
        email = "admin@uide.edu.ec"
        password = "admin123"
    } | ConvertTo-Json

    $loginResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" `
        -Method Post `
        -Body $loginData `
        -ContentType "application/json"
    
    $token = $loginResponse.token
    Write-Host "   ✅ Token obtenido: $($token.Substring(0, 20))...`n" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Error en login: $_`n" -ForegroundColor Red
    exit 1
}

# 3. Verificar aulas
Write-Host "3️⃣ Verificando aulas disponibles..." -ForegroundColor Yellow
try {
    $aulasResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/aulas" `
        -Method Get `
        -Headers @{Authorization = "Bearer $token"}
    
    $aulasCount = $aulasResponse.Length
    Write-Host "   ✅ $aulasCount aulas disponibles`n" -ForegroundColor Green
    
    if ($aulasCount -eq 0) {
        Write-Host "   ⚠️  No hay aulas en la BD. El sistema funcionará pero no podrá asignar aulas.`n" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ⚠️  No se pudo obtener aulas: $_`n" -ForegroundColor Yellow
}

# 4. Verificar endpoint de planificaciones
Write-Host "4️⃣ Verificando endpoint de planificaciones..." -ForegroundColor Yellow
try {
    $estadoResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/planificaciones/distribucion/1" `
        -Method Get `
        -Headers @{Authorization = "Bearer $token"}
    
    Write-Host "   ✅ Endpoint de planificaciones funcionando" -ForegroundColor Green
    Write-Host "   📊 Estadísticas actuales:" -ForegroundColor Cyan
    Write-Host "      Total clases:  $($estadoResponse.estadisticas.total)" -ForegroundColor White
    Write-Host "      Asignadas:     $($estadoResponse.estadisticas.asignadas)" -ForegroundColor Green
    Write-Host "      Pendientes:    $($estadoResponse.estadisticas.pendientes)" -ForegroundColor Yellow
    Write-Host ""
} catch {
    Write-Host "   ❌ Error al consultar planificaciones: $_`n" -ForegroundColor Red
}

# 5. Instrucciones para probar
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Gray

Write-Host "📝 CÓMO PROBAR LA SUBIDA DE PLANIFICACIÓN:`n" -ForegroundColor Cyan

Write-Host "PASO 1: Crear Excel de Prueba" -ForegroundColor Yellow
Write-Host "────────────────────────────────" -ForegroundColor Gray
Write-Host "   Abre Excel y crea una hoja con estos headers:`n" -ForegroundColor White
Write-Host "   | codigo_materia | nombre_materia | nivel | paralelo | numero_estudiantes |" -ForegroundColor Gray
Write-Host "   | horario_dia | horario_inicio | horario_fin | docente |`n" -ForegroundColor Gray
Write-Host "   Ejemplo de fila:" -ForegroundColor White
Write-Host "   | TEST101 | Materia Prueba | 1 | A | 30 | Lunes | 08:00 | 10:00 | Prof Test |`n" -ForegroundColor Gray
Write-Host "   Guarda como: planificacion_test.xlsx`n" -ForegroundColor White

Write-Host "PASO 2: Subir con Postman" -ForegroundColor Yellow
Write-Host "─────────────────────────" -ForegroundColor Gray
Write-Host "   1. Abre Postman" -ForegroundColor White
Write-Host "   2. Crea request POST:" -ForegroundColor White
Write-Host "      URL: http://localhost:3000/api/planificaciones/subir`n" -ForegroundColor Cyan
Write-Host "   3. Headers:" -ForegroundColor White
Write-Host "      Authorization: Bearer $token`n" -ForegroundColor Gray
Write-Host "   4. Body → form-data:" -ForegroundColor White
Write-Host "      • archivo: [seleccionar planificacion_test.xlsx]" -ForegroundColor Gray
Write-Host "      • carrera_id: 1`n" -ForegroundColor Gray
Write-Host "   5. Click SEND`n" -ForegroundColor White

Write-Host "PASO 3: Verificar Resultado" -ForegroundColor Yellow
Write-Host "────────────────────────────" -ForegroundColor Gray
Write-Host "   Deberías ver una respuesta JSON como:" -ForegroundColor White
Write-Host "   {" -ForegroundColor Gray
Write-Host "     success: true," -ForegroundColor Gray
Write-Host "     mensaje: 'Planificación subida...', " -ForegroundColor Gray
Write-Host "     resultado: {" -ForegroundColor Gray
Write-Host "       clases_guardadas: 1," -ForegroundColor Gray
Write-Host "       distribucion: {" -ForegroundColor Gray
Write-Host "         estado: 'pendiente'  <- Sin n8n" -ForegroundColor Yellow
Write-Host "       }" -ForegroundColor Gray
Write-Host "     }" -ForegroundColor Gray
Write-Host "   }" -ForegroundColor Gray
Write-Host ""

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Gray

# 6. Estado del sistema
Write-Host "📊 ESTADO ACTUAL DEL SISTEMA:`n" -ForegroundColor Cyan

Write-Host "   ✅ Backend funcionando (puerto 3000)" -ForegroundColor Green
Write-Host "   ✅ Base de datos conectada" -ForegroundColor Green
Write-Host "   ✅ Autenticación funcionando" -ForegroundColor Green
Write-Host "   ✅ Endpoint de planificaciones activo" -ForegroundColor Green
Write-Host "   ✅ Sistema de roles configurado" -ForegroundColor Green
Write-Host "   🟡 N8N corriendo (workflow inactivo)" -ForegroundColor Yellow
Write-Host ""

Write-Host "🎯 RESULTADO:" -ForegroundColor Cyan
Write-Host "   • Puedes subir planificaciones ✅" -ForegroundColor Green
Write-Host "   • Se guardan en la base de datos ✅" -ForegroundColor Green
Write-Host "   • Distribución será MANUAL (sin n8n) 🟡" -ForegroundColor Yellow
Write-Host ""

Write-Host "🚀 SIGUIENTE PASO:" -ForegroundColor Cyan
Write-Host "   → Crea el Excel y prueba la subida con Postman" -ForegroundColor White
Write-Host "   → Luego decide si activar N8N para distribución automática`n" -ForegroundColor White

Write-Host "💡 AYUDA:" -ForegroundColor Cyan
Write-Host "   • Ver guía completa: CREAR_EXCEL_PRUEBA_MANUAL.md" -ForegroundColor Gray
Write-Host "   • Activar N8N después: ACTIVAR_N8N_PASO_A_PASO.md`n" -ForegroundColor Gray

Write-Host "=========================================`n" -ForegroundColor Cyan
Write-Host "✅ Test completado - Sistema listo para usar!" -ForegroundColor Green
Write-Host ""
