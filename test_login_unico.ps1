# ============================================
# TEST UNICO: Verificar UN director
# (Evita rate limiter)
# ============================================

Write-Host "`n=== TEST UNICO DE LOGIN ===" -ForegroundColor Cyan

# Test con Raquel (Derecho)
Write-Host "`nTesteando: Raquel Veintimilla (Derecho)" -ForegroundColor Yellow

$loginData = @{
    email = "raquel.veintimilla.director@uide.edu.ec"
    password = "DirectorUide2026!"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" `
        -Method Post `
        -Body $loginData `
        -ContentType "application/json" `
        -ErrorAction Stop
    
    Write-Host "`n[OK] LOGIN EXITOSO!" -ForegroundColor Green
    Write-Host "`nDatos del Director:" -ForegroundColor White
    Write-Host "   ID: $($response.usuario.id)" -ForegroundColor Gray
    Write-Host "   Nombre: $($response.usuario.nombre) $($response.usuario.apellido)" -ForegroundColor Gray
    Write-Host "   Email: $($response.usuario.email)" -ForegroundColor Gray
    Write-Host "   Rol: $($response.usuario.rol)" -ForegroundColor Gray
    Write-Host "   Carrera: $($response.usuario.carrera_director)" -ForegroundColor Gray
    Write-Host "`nToken JWT:" -ForegroundColor White
    Write-Host "   $($response.token.Substring(0,50))..." -ForegroundColor Gray
    
    Write-Host "`n" + "="*50 -ForegroundColor Cyan
    Write-Host "`n[*] CREDENCIALES FUNCIONANDO CORRECTAMENTE" -ForegroundColor Green
    Write-Host "`nPuedes usar las mismas credenciales para todos:`n" -ForegroundColor White
    Write-Host "Password: DirectorUide2026!`n" -ForegroundColor Cyan
    
} catch {
    Write-Host "`n[ERROR] Login fallo" -ForegroundColor Red
    Write-Host "$($_.Exception.Message)`n" -ForegroundColor Red
    
    Write-Host "Soluciones:" -ForegroundColor Yellow
    Write-Host "1. Verifica que backend este corriendo: docker ps" -ForegroundColor White
    Write-Host "2. Ve los logs: docker logs gestion_aulas_backend --tail 20" -ForegroundColor White
    Write-Host "3. Reinicia backend: docker-compose restart backend`n" -ForegroundColor White
}
