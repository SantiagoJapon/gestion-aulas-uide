# ============================================
# TEST: Login de Directores
# ============================================

Write-Host "`n=== TEST DE LOGIN DIRECTORES ===" -ForegroundColor Cyan

$directores = @(
    @{
        nombre = "Raquel Veintimilla (Derecho)"
        email = "raquel.veintimilla.director@uide.edu.ec"
        password = "DirectorUide2026!"
        carrera = "Derecho"
    },
    @{
        nombre = "Lorena Conde (Informatica)"
        email = "lorena.conde.director@uide.edu.ec"
        password = "DirectorUide2026!"
        carrera = "Ingenieria en TIC"
    },
    @{
        nombre = "Freddy Salazar (Arquitectura)"
        email = "freddy.salazar.director@uide.edu.ec"
        password = "DirectorUide2026!"
        carrera = "Arquitectura y Urbanismo"
    }
)

$exitosos = 0
$fallidos = 0

foreach ($director in $directores) {
    Write-Host "`nTesteando: $($director.nombre)" -ForegroundColor Yellow
    
    $loginData = @{
        email = $director.email
        password = $director.password
    } | ConvertTo-Json
    
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" `
            -Method Post `
            -Body $loginData `
            -ContentType "application/json" `
            -ErrorAction Stop
        
        if ($response.token) {
            Write-Host "   [OK] Login exitoso" -ForegroundColor Green
            Write-Host "   Email: $($director.email)" -ForegroundColor Gray
            Write-Host "   Nombre: $($response.usuario.nombre) $($response.usuario.apellido)" -ForegroundColor Gray
            Write-Host "   Rol: $($response.usuario.rol)" -ForegroundColor Gray
            Write-Host "   Carrera: $($response.usuario.carrera_director)" -ForegroundColor Gray
            Write-Host "   Token: $($response.token.Substring(0,20))..." -ForegroundColor Gray
            $exitosos++
        } else {
            Write-Host "   [ERROR] No se recibio token" -ForegroundColor Red
            $fallidos++
        }
    } catch {
        Write-Host "   [ERROR] Login fallo" -ForegroundColor Red
        Write-Host "   $($_.Exception.Message)" -ForegroundColor Red
        $fallidos++
    }
}

# Resumen
Write-Host "`n" + "="*50 -ForegroundColor Cyan
Write-Host "`nRESUMEN:" -ForegroundColor White
Write-Host "   Exitosos: $exitosos" -ForegroundColor Green
Write-Host "   Fallidos: $fallidos" -ForegroundColor $(if ($fallidos -eq 0) { "Green" } else { "Red" })

if ($fallidos -eq 0) {
    Write-Host "`n[*] TODAS LAS CREDENCIALES FUNCIONAN CORRECTAMENTE" -ForegroundColor Green
    Write-Host "`nLos directores pueden acceder al sistema.`n" -ForegroundColor White
} else {
    Write-Host "`n[!] HAY PROBLEMAS CON ALGUNAS CREDENCIALES" -ForegroundColor Yellow
    Write-Host "`nVerifica los logs del backend:`n" -ForegroundColor White
    Write-Host "docker logs gestion_aulas_backend --tail 20`n" -ForegroundColor Gray
}

Write-Host "Credenciales completas en: CREDENCIALES_DIRECTORES.md`n" -ForegroundColor Cyan
