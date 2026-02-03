$webhookUrl = "http://localhost:5678/webhook-test/maestro"

$payload = @{
    accion = "distribuir_aulas"
}

$jsonPayload = $payload | ConvertTo-Json

Write-Host "Triggering distribution at $webhookUrl..."
try {
    $response = Invoke-RestMethod -Uri $webhookUrl -Method Post -Body $jsonPayload -ContentType "application/json"
    Write-Host "Success! Distribution started."
    Write-Host ($response | ConvertTo-Json -Depth 5)
}
catch {
    Write-Error "Error triggering distribution: $_"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $respBody = $reader.ReadToEnd()
        Write-Error "Response Body: $respBody"
    }
}
