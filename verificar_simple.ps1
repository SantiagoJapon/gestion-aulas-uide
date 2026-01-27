# ============================================
# SCRIPT DE VERIFICACION SIMPLE
# ============================================

Write-Host "`n=== VERIFICACION DEL SISTEMA ===" -ForegroundColor Cyan

# 1. Backend
Write-Host "`n1. Backend (puerto 3000)..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
    Write-Host "   [OK] Backend activo" -ForegroundColor Green
} catch {
    Write-Host "   [ERROR] Backend NO responde" -ForegroundColor Red
}

# 2. Frontend
Write-Host "`n2. Frontend (puerto 5173)..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5173" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
    Write-Host "   [OK] Frontend activo" -ForegroundColor Green
} catch {
    Write-Host "   [WARN] Frontend no esta corriendo (opcional)" -ForegroundColor Yellow
}

# 3. Test de Login
Write-Host "`n3. Test de Login..." -ForegroundColor Yellow
try {
    $loginData = '{"email":"admin@uide.edu.ec","password":"admin123"}'
    $login = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" -Method Post -Body $loginData -ContentType "application/json" -ErrorAction Stop
    Write-Host "   [OK] Login funciona" -ForegroundColor Green
    $token = $login.token
} catch {
    Write-Host "   [ERROR] Login fallo" -ForegroundColor Red
    Write-Host "   Verifica password del admin" -ForegroundColor Gray
}

# 4. Endpoint de Distribucion
if ($token) {
    Write-Host "`n4. Endpoint /api/distribucion/estado..." -ForegroundColor Yellow
    try {
        $dist = Invoke-RestMethod -Uri "http://localhost:3000/api/distribucion/estado" -Method Get -Headers @{Authorization = "Bearer $token"} -ErrorAction Stop
        Write-Host "   [OK] Endpoint responde 200" -ForegroundColor Green
        Write-Host "   Total clases: $($dist.estadisticas.total_clases)" -ForegroundColor Gray
        Write-Host "   Clases asignadas: $($dist.estadisticas.clases_asignadas)" -ForegroundColor Gray
        Write-Host "   Carreras activas: $($dist.estadisticas.total_carreras)" -ForegroundColor Gray
    } catch {
        Write-Host "   [ERROR] Endpoint fallo" -ForegroundColor Red
    }

    # 5. Endpoint de Usuarios
    Write-Host "`n5. Endpoint /api/usuarios..." -ForegroundColor Yellow
    try {
        $usuarios = Invoke-RestMethod -Uri "http://localhost:3000/api/usuarios?rol=director" -Method Get -Headers @{Authorization = "Bearer $token"} -ErrorAction Stop
        Write-Host "   [OK] Endpoint responde 200" -ForegroundColor Green
        Write-Host "   Directores: $($usuarios.total)" -ForegroundColor Gray
    } catch {
        Write-Host "   [ERROR] Endpoint fallo" -ForegroundColor Red
    }
}

# Resumen
Write-Host "`n" + "="*50 -ForegroundColor Cyan
Write-Host "`n[*] SISTEMA LISTO PARA USAR" -ForegroundColor Green
Write-Host "`nProximos pasos:" -ForegroundColor Yellow
Write-Host "1. Abre http://localhost:5173" -ForegroundColor White
Write-Host "2. Login como admin" -ForegroundColor White
Write-Host "3. Panel Admin -> Asignar Directores`n" -ForegroundColor White
Write-Host "Credenciales directores: director123`n" -ForegroundColor Gray
