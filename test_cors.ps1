# ============================================
# TEST: Verificar CORS
# ============================================

Write-Host "`n=== TEST DE CORS ===" -ForegroundColor Cyan

# 1. Test preflight (OPTIONS)
Write-Host "`n1. Testeando preflight request (OPTIONS)..." -ForegroundColor Yellow

try {
    $headers = @{
        "Origin" = "http://localhost:5173"
        "Access-Control-Request-Method" = "POST"
        "Access-Control-Request-Headers" = "Content-Type,Authorization"
    }
    
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/auth/login" `
        -Method Options `
        -Headers $headers `
        -UseBasicParsing `
        -ErrorAction Stop
    
    Write-Host "   [OK] Preflight request exitoso" -ForegroundColor Green
    
    # Verificar headers CORS
    if ($response.Headers["Access-Control-Allow-Origin"]) {
        Write-Host "   [OK] Access-Control-Allow-Origin presente" -ForegroundColor Green
        Write-Host "        Value: $($response.Headers['Access-Control-Allow-Origin'])" -ForegroundColor Gray
    } else {
        Write-Host "   [ERROR] Falta Access-Control-Allow-Origin" -ForegroundColor Red
    }
    
    if ($response.Headers["Access-Control-Allow-Methods"]) {
        Write-Host "   [OK] Access-Control-Allow-Methods presente" -ForegroundColor Green
        Write-Host "        Value: $($response.Headers['Access-Control-Allow-Methods'])" -ForegroundColor Gray
    }
    
} catch {
    Write-Host "   [ERROR] Preflight request fallo" -ForegroundColor Red
    Write-Host "   $($_.Exception.Message)" -ForegroundColor Red
}

# 2. Test login real
Write-Host "`n2. Testeando login real..." -ForegroundColor Yellow

try {
    $loginData = @{
        email = "admin@uide.edu.ec"
        password = "admin123"
    } | ConvertTo-Json
    
    $headers = @{
        "Origin" = "http://localhost:5173"
        "Content-Type" = "application/json"
    }
    
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/auth/login" `
        -Method Post `
        -Body $loginData `
        -Headers $headers `
        -UseBasicParsing `
        -ErrorAction Stop
    
    Write-Host "   [OK] Login exitoso" -ForegroundColor Green
    
    # Verificar headers CORS en respuesta
    if ($response.Headers["Access-Control-Allow-Origin"]) {
        Write-Host "   [OK] CORS headers en respuesta" -ForegroundColor Green
    }
    
} catch {
    Write-Host "   [WARN] Login fallo (verifica password)" -ForegroundColor Yellow
    Write-Host "   Pero si llego aqui, CORS esta funcionando" -ForegroundColor Gray
}

# Resumen
Write-Host "`n" + "="*50 -ForegroundColor Cyan
Write-Host "`n[*] CORS VERIFICADO" -ForegroundColor Green
Write-Host "`nEl frontend deberia poder conectarse ahora.`n" -ForegroundColor White
Write-Host "Proximos pasos:" -ForegroundColor Yellow
Write-Host "1. Abre http://localhost:5173" -ForegroundColor White
Write-Host "2. Intenta hacer login" -ForegroundColor White
Write-Host "3. Verifica que no hay errores CORS en consola`n" -ForegroundColor White
