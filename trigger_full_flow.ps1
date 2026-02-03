$webhookUrl = "http://localhost:5678/webhook/maestro"

# Paso 1: Subir Planificación
Write-Host "1. Uploading Plan (Architecture)..."
$payloadUpload = @{
    accion = "subir_planificacion"
    datos  = @{
        carrera_nombre = "Arquitectura"
        archivo_url    = "http://gestion_aulas_backend:3000/planificacion-arquitectura.xlsx"
    }
}
$jsonUpload = $payloadUpload | ConvertTo-Json -Depth 5
try {
    $res1 = Invoke-RestMethod -Uri $webhookUrl -Method Post -Body $jsonUpload -ContentType "application/json"
    Write-Host "Upload Success:"
    Write-Host ($res1 | ConvertTo-Json -Depth 5)
}
catch {
    Write-Error "Upload Failed: $_"
    exit
}

Start-Sleep -Seconds 5

# Paso 2: Distribuir Aulas
Write-Host "2. Triggering Distribution..."
$payloadDist = @{
    accion = "distribuir_aulas"
}
$jsonDist = $payloadDist | ConvertTo-Json
try {
    $res2 = Invoke-RestMethod -Uri $webhookUrl -Method Post -Body $jsonDist -ContentType "application/json"
    Write-Host "Distribution Started:"
    Write-Host ($res2 | ConvertTo-Json -Depth 5)
}
catch {
    Write-Error "Distribution Failed: $_"
}
