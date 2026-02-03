$filePath = "C:\Users\sjapo\OneDrive\Documents\Proyecto de Titulacion\Lista de Estudiantes y Matriculados por Escuela-4.xlsx"
$webhookUrl = "http://localhost:5678/webhook-test/maestro"

Write-Host "Reading file: $filePath"
$bytes = [System.IO.File]::ReadAllBytes($filePath)
$base64 = [Convert]::ToBase64String($bytes)

# Estructura corregida: 'datos' en n8n será este objeto completo
$payload = @{
    accion         = "subir_estudiantes"
    archivo_base64 = $base64
    nombre_archivo = "Lista de Estudiantes y Matriculados por Escuela-4.xlsx"
}

$jsonPayload = $payload | ConvertTo-Json -Depth 5

Write-Host "Sending payload to $webhookUrl..."
try {
    $response = Invoke-RestMethod -Uri $webhookUrl -Method Post -Body $jsonPayload -ContentType "application/json"
    Write-Host "Success!"
    Write-Host ($response | ConvertTo-Json -Depth 5)
}
catch {
    Write-Error "Error sending request: $_"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $respBody = $reader.ReadToEnd()
        Write-Error "Response Body: $respBody"
    }
}
