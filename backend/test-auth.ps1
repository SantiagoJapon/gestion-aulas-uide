# Script de prueba para autenticación
Write-Host "🔍 Probando endpoints de autenticación..." -ForegroundColor Cyan
Write-Host ""

# 1. Registrar usuario
Write-Host "1️⃣ Registrando usuario admin..." -ForegroundColor Yellow
$registerBody = @{
    nombre = "Admin"
    apellido = "Sistema"
    email = "admin@uide.edu.ec"
    password = "admin123"
    rol = "admin"
    cedula = "1234567890"
    telefono = "0999999999"
} | ConvertTo-Json

try {
    $registerResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/register" `
        -Method POST `
        -ContentType "application/json" `
        -Body $registerBody
    
    Write-Host "✅ Usuario registrado exitosamente!" -ForegroundColor Green
    Write-Host "   ID: $($registerResponse.usuario.id)" -ForegroundColor Gray
    Write-Host "   Email: $($registerResponse.usuario.email)" -ForegroundColor Gray
    Write-Host "   Rol: $($registerResponse.usuario.rol)" -ForegroundColor Gray
    Write-Host "   Token: $($registerResponse.token.Substring(0, 20))..." -ForegroundColor Gray
    Write-Host ""
    
    # Guardar token para el login
    $global:token = $registerResponse.token
} catch {
    Write-Host "❌ Error al registrar: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "   Detalles: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
    Write-Host ""
}

# 2. Login
Write-Host "2️⃣ Iniciando sesión..." -ForegroundColor Yellow
$loginBody = @{
    email = "admin@uide.edu.ec"
    password = "admin123"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body $loginBody
    
    Write-Host "✅ Login exitoso!" -ForegroundColor Green
    Write-Host "   Usuario: $($loginResponse.usuario.nombre) $($loginResponse.usuario.apellido)" -ForegroundColor Gray
    Write-Host "   Email: $($loginResponse.usuario.email)" -ForegroundColor Gray
    Write-Host "   Rol: $($loginResponse.usuario.rol)" -ForegroundColor Gray
    Write-Host "   Token: $($loginResponse.token.Substring(0, 20))..." -ForegroundColor Gray
    Write-Host ""
    
    # Guardar token para pruebas de endpoints protegidos
    $global:token = $loginResponse.token
} catch {
    Write-Host "❌ Error al hacer login: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "   Detalles: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
    Write-Host ""
}

# 3. Obtener perfil (endpoint protegido)
if ($global:token) {
    Write-Host "3️⃣ Obteniendo perfil (endpoint protegido)..." -ForegroundColor Yellow
    try {
        $headers = @{
            "Authorization" = "Bearer $global:token"
        }
        
        $profileResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/perfil" `
            -Method GET `
            -Headers $headers
        
        Write-Host "✅ Perfil obtenido exitosamente!" -ForegroundColor Green
        Write-Host "   Nombre: $($profileResponse.usuario.nombre) $($profileResponse.usuario.apellido)" -ForegroundColor Gray
        Write-Host "   Email: $($profileResponse.usuario.email)" -ForegroundColor Gray
        Write-Host "   Rol: $($profileResponse.usuario.rol)" -ForegroundColor Gray
        Write-Host ""
    } catch {
        Write-Host "❌ Error al obtener perfil: $($_.Exception.Message)" -ForegroundColor Red
        if ($_.ErrorDetails.Message) {
            Write-Host "   Detalles: $($_.ErrorDetails.Message)" -ForegroundColor Red
        }
        Write-Host ""
    }
}

Write-Host "Pruebas completadas!" -ForegroundColor Cyan

