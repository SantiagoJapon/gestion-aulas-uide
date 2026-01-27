# Script para ver usuarios de n8n
# Uso: .\scripts\ver-usuarios-n8n.ps1

Write-Host "🔍 Buscando usuarios en n8n..." -ForegroundColor Cyan
Write-Host ""

$query = 'SELECT id, email, "firstName", "lastName", "createdAt" FROM "user" ORDER BY "createdAt" DESC;'

$result = docker-compose exec -T postgres psql -U admin -d n8n_db -c $query

Write-Host $result

Write-Host ""
Write-Host "⚠️ NOTA: Las contraseñas están encriptadas y no se pueden ver." -ForegroundColor Yellow
Write-Host "Si no recuerdas tu contraseña, puedes:" -ForegroundColor Yellow
Write-Host "1. Crear un nuevo usuario desde la interfaz de n8n" -ForegroundColor Gray
Write-Host "2. O resetear completamente n8n (borra todo)" -ForegroundColor Gray










