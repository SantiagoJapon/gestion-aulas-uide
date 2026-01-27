# Script para verificar estudiantes guardados
Write-Host "🔍 Verificando estudiantes en la base de datos..." -ForegroundColor Cyan
Write-Host ""

# Ver primeros 5 estudiantes con todos sus datos
docker exec gestion_aulas_db psql -U postgres -d gestion_aulas -c "SELECT cedula, nombre, email, escuela, nivel FROM estudiantes LIMIT 5;"

Write-Host ""
Write-Host "📊 Total de estudiantes:" -ForegroundColor Green
docker exec gestion_aulas_db psql -U postgres -d gestion_aulas -c "SELECT COUNT(*) as total FROM estudiantes;"

Write-Host ""
Write-Host "📧 Estudiantes con email:" -ForegroundColor Yellow
docker exec gestion_aulas_db psql -U postgres -d gestion_aulas -c "SELECT COUNT(*) as total_con_email FROM estudiantes WHERE email IS NOT NULL;"

Write-Host ""
Write-Host "🏫 Distribución por escuela:" -ForegroundColor Magenta
docker exec gestion_aulas_db psql -U postgres -d gestion_aulas -c "SELECT escuela, COUNT(*) as cantidad FROM estudiantes GROUP BY escuela ORDER BY cantidad DESC LIMIT 5;"
