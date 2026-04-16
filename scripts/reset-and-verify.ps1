$ErrorActionPreference = "Stop"

Write-Host "Stopping and removing containers/volumes..."
docker compose down -v

Write-Host "Starting stack..."
docker compose up --build -d

Write-Host "Waiting for Postgres to become healthy..."
$pgHealthy = $false
for ($i = 0; $i -lt 60; $i++) {
    $status = docker inspect --format='{{json .State.Health.Status}}' mybudget-postgres 2>$null
    if ($status -eq '"healthy"') {
        $pgHealthy = $true
        break
    }
    Start-Sleep -Seconds 2
}
if (-not $pgHealthy) {
    Write-Error "Postgres never became healthy."
}

Write-Host "Waiting for API /health..."
$apiHealthy = $false
for ($i = 0; $i -lt 60; $i++) {
    try {
        $resp = Invoke-RestMethod -Uri "http://localhost:8080/health" -Method Get -TimeoutSec 5
        if ($resp.status -eq "ok") {
            $apiHealthy = $true
            break
        }
    } catch {
    }
    Start-Sleep -Seconds 2
}
if (-not $apiHealthy) {
    Write-Error "API never became healthy."
}

Write-Host "Running schema verification..."
Get-Content ".\scripts\verify-schema.sql" | docker exec -i mybudget-postgres psql -U postgres -d mybudget

Write-Host "Schema verification complete."