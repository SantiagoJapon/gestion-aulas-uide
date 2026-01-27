# Test: Asignar Director a Carrera

Write-Host "`n=== TEST: Asignar Director a Carrera ===" -ForegroundColor Cyan

# 1. Login como admin
Write-Host "`n1. Login..." -ForegroundColor Yellow
$loginData = @{
    email = "admin@uide.edu.ec"
    password = "admin123"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" `
        -Method Post `
        -Body $loginData `
        -ContentType "application/json"
    
    $token = $loginResponse.token
    Write-Host "   OK Token obtenido" -ForegroundColor Green
} catch {
    Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 2. Listar directores
Write-Host "`n2. Listando directores..." -ForegroundColor Yellow
try {
    $directores = Invoke-RestMethod -Uri "http://localhost:3000/api/usuarios?rol=director" `
        -Method Get `
        -Headers @{Authorization = "Bearer $token"}
    
    Write-Host "   OK Directores encontrados:" -ForegroundColor Green
    foreach ($dir in $directores.usuarios) {
        Write-Host "      ID: $($dir.id) - $($dir.nombre) $($dir.apellido) - $($dir.email)" -ForegroundColor White
        Write-Host "         Carrera actual: $($dir.carrera_director)" -ForegroundColor Gray
    }
} catch {
    Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

# 3. Listar carreras
Write-Host "`n3. Listando carreras activas..." -ForegroundColor Yellow
try {
    $carreras = Invoke-WebRequest -Uri "http://localhost:3000/api/distribucion/estado" `
        -Method Get `
        -Headers @{Authorization = "Bearer $token"} `
        -UseBasicParsing
    
    $carrerasData = ($carreras.Content | ConvertFrom-Json)
    Write-Host "   OK Carreras encontradas:" -ForegroundColor Green
    foreach ($car in $carrerasData.carreras) {
        Write-Host "      ID: $($car.id) - $($car.nombre_carrera)" -ForegroundColor White
    }
} catch {
    Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

# 4. Intentar asignar Freddy (ID 6) a Derecho
Write-Host "`n4. Asignando Freddy (ID 6) a Derecho..." -ForegroundColor Yellow
$asignacionData = @{
    carrera = "Derecho"
} | ConvertTo-Json

Write-Host "   Datos a enviar: $asignacionData" -ForegroundColor Gray

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/usuarios/6/carrera" `
        -Method Put `
        -Body $asignacionData `
        -ContentType "application/json" `
        -Headers @{Authorization = "Bearer $token"}
    
    Write-Host "   OK Asignacion exitosa!" -ForegroundColor Green
    Write-Host "   Usuario: $($response.usuario.nombre) $($response.usuario.apellido)" -ForegroundColor White
    Write-Host "   Carrera: $($response.usuario.carrera_director)" -ForegroundColor White
} catch {
    Write-Host "   ERROR: $_" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
        $errorBody = $reader.ReadToEnd()
        Write-Host "   Detalles: $errorBody" -ForegroundColor Red
    }
}

# 5. Verificar asignacion
Write-Host "`n5. Verificando asignacion..." -ForegroundColor Yellow
try {
    $directorUpdated = Invoke-RestMethod -Uri "http://localhost:3000/api/usuarios?rol=director" `
        -Method Get `
        -Headers @{Authorization = "Bearer $token"}
    
    $freddy = $directorUpdated.usuarios | Where-Object { $_.id -eq 6 }
    if ($freddy) {
        Write-Host "   OK Freddy actualizado:" -ForegroundColor Green
        Write-Host "      Carrera: $($freddy.carrera_director)" -ForegroundColor White
    }
} catch {
    Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== FIN TEST ===`n" -ForegroundColor Cyan
