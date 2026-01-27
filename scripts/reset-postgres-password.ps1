# Script para resetear/verificar contraseña de PostgreSQL

Write-Host "🔧 Verificando y reseteando contraseña de PostgreSQL..." -ForegroundColor Cyan

# Verificar que el contenedor está corriendo
Write-Host "`n1. Verificando contenedor..." -ForegroundColor Yellow
docker-compose ps postgres

# Resetear contraseña desde dentro del contenedor
Write-Host "`n2. Reseteando contraseña del usuario 'admin'..." -ForegroundColor Yellow
docker-compose exec -T postgres psql -U admin -d postgres <<EOF
ALTER USER admin WITH PASSWORD 'uide_password_2024';
\q
EOF

# Verificar que funciona
Write-Host "`n3. Verificando conexión..." -ForegroundColor Yellow
docker-compose exec postgres psql -U admin -d gestion_aulas -c "SELECT 'Contraseña reseteada exitosamente!' as mensaje;"

Write-Host "`n✅ Proceso completado!" -ForegroundColor Green
Write-Host "`nCredenciales:" -ForegroundColor Cyan
Write-Host "  Host: localhost" -ForegroundColor White
Write-Host "  Puerto: 5432" -ForegroundColor White
Write-Host "  Usuario: admin" -ForegroundColor White
Write-Host "  Contraseña: uide_password_2024" -ForegroundColor White
Write-Host "  Base de Datos: gestion_aulas" -ForegroundColor White






