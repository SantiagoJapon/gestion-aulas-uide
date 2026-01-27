# Actualizar credenciales de n8n en .env
(Get-Content .env) -replace 'N8N_USER=admin', 'N8N_USER=uide_admin' -replace 'N8N_PASSWORD=admin123', 'N8N_PASSWORD=uide2024!' | Set-Content .env
Write-Host "âœ… Credenciales actualizadas en .env"
Write-Host "Nuevo usuario: uide_admin"
Write-Host "Nueva contraseÃ±a: uide2024!"
