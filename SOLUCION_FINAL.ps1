# SOLUCION FINAL - SCRIPT AUTOMATICO
Write-Host "=== SOLUCIÓN FINAL - INICIANDO ===" -ForegroundColor Cyan

# 1. Levantar Docker
Write-Host "1. Levantando PostgreSQL con Docker..." -ForegroundColor Yellow
docker-compose up -d postgres
Start-Sleep -Seconds 10

# 2. Cambiar .env para usar Docker
Write-Host "2. Configurando .env para Docker..." -ForegroundColor Yellow
cd backend
(Get-Content .env) -replace 'DB_PASSWORD=admin', 'DB_PASSWORD=postgres' -replace 'DB_PORT=5432', 'DB_PORT=5433' | Set-Content .env

# 3. Crear usuarios
Write-Host "3. Creando usuarios..." -ForegroundColor Yellow
node scripts/crear_usuarios_EMERGENCIA.js

Write-Host ""
Write-Host "=== ¡LISTO! ===" -ForegroundColor Green
Write-Host ""
Write-Host "AHORA EJECUTA EN DOS TERMINALES:" -ForegroundColor White
Write-Host ""
Write-Host "Terminal 1:" -ForegroundColor Cyan
Write-Host "  cd backend" -ForegroundColor Gray
Write-Host "  npm start" -ForegroundColor Gray
Write-Host ""
Write-Host "Terminal 2:" -ForegroundColor Cyan
Write-Host "  cd frontend" -ForegroundColor Gray
Write-Host "  npm install lucide-react" -ForegroundColor Gray
Write-Host "  npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "LOGIN: http://localhost:5173" -ForegroundColor Green
Write-Host "  admin@uide.edu.ec / admin123" -ForegroundColor Gray
