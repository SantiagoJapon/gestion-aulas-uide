# Test del endpoint de directores

Write-Host "🔐 1. Obteniendo token de admin..." -ForegroundColor Cyan
$loginResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" `
    -Method POST `
    -ContentType "application/json" `
    -Body '{"email":"admin@uide.edu.ec","password":"admin123"}'

$token = $loginResponse.token
Write-Host "✅ Token obtenido" -ForegroundColor Green
Write-Host ""

Write-Host "👥 2. Obteniendo directores..." -ForegroundColor Cyan
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

try {
    $directores = Invoke-RestMethod -Uri "http://localhost:3000/api/usuarios?rol=director" `
        -Method GET `
        -Headers $headers

    Write-Host "✅ $($directores.total) directores encontrados" -ForegroundColor Green
    Write-Host ""

    foreach ($dir in $directores.usuarios) {
        Write-Host "👤 $($dir.nombre) $($dir.apellido)" -ForegroundColor Yellow
        Write-Host "   Email: $($dir.email)"
        if ($dir.carrera_nombre) {
            Write-Host "   Carrera: $($dir.carrera_nombre)" -ForegroundColor Green
        } else {
            Write-Host "   Carrera: SIN ASIGNAR" -ForegroundColor Red
        }
        Write-Host ""
    }
} catch {
    Write-Host "❌ Error al obtener directores:" -ForegroundColor Red
    Write-Host $_.Exception.Message
}
