# Script para arreglar autenticación de PostgreSQL

Write-Host "🔧 Arreglando autenticación de PostgreSQL..." -ForegroundColor Cyan

# 1. Verificar usuario
Write-Host "`n1. Verificando usuario 'admin'..." -ForegroundColor Yellow
docker-compose exec -T postgres psql -U admin -d postgres <<EOF
SELECT rolname, rolcanlogin, rolpassword IS NOT NULL as has_password 
FROM pg_roles 
WHERE rolname = 'admin';
\q
EOF

# 2. Resetear contraseña con método seguro
Write-Host "`n2. Reseteando contraseña..." -ForegroundColor Yellow
docker-compose exec -T postgres psql -U admin -d postgres <<EOF
-- Asegurar que el usuario puede hacer login
ALTER USER admin WITH LOGIN;

-- Resetear contraseña
ALTER USER admin WITH PASSWORD 'uide_password_2024';

-- Verificar
SELECT 'Contraseña reseteada' as status;
\q
EOF

# 3. Verificar conexión
Write-Host "`n3. Verificando conexión..." -ForegroundColor Yellow
docker-compose exec postgres psql -U admin -d gestion_aulas -c "SELECT 'Conexión exitosa!' as mensaje;"

Write-Host "`n✅ Proceso completado!" -ForegroundColor Green
Write-Host "`nAhora prueba con estas credenciales:" -ForegroundColor Cyan
Write-Host "  Host: localhost" -ForegroundColor White
Write-Host "  Puerto: 5432" -ForegroundColor White
Write-Host "  Usuario: admin" -ForegroundColor White
Write-Host "  Contraseña: uide_password_2024" -ForegroundColor White
Write-Host "  Base de Datos: gestion_aulas" -ForegroundColor White


