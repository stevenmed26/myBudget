$ErrorActionPreference = "Stop"

function Assert-True {
    param(
        [bool]$Condition,
        [string]$Message
    )
    if (-not $Condition) {
        throw $Message
    }
}

$email = "smoke_{0}@test.local" -f ([guid]::NewGuid().ToString("N").Substring(0, 8))
$password = "password123"

Write-Host "Using test user: $email"

# Health check first
$health = Invoke-RestMethod `
    -Uri "http://localhost:8080/health" `
    -Method GET

Assert-True ($health.status -eq "ok") "Health check failed"

# Register
$registerBody = @{
    email = $email
    password = $password
} | ConvertTo-Json

$registerJson = Invoke-RestMethod `
    -Uri "http://localhost:8080/api/v1/auth/register" `
    -Method POST `
    -ContentType "application/json" `
    -Body $registerBody

$accessToken = $registerJson.access_token
$refreshToken = $registerJson.refresh_token

Assert-True (-not [string]::IsNullOrWhiteSpace($accessToken)) "Missing access token after register"
Assert-True (-not [string]::IsNullOrWhiteSpace($refreshToken)) "Missing refresh token after register"
Assert-True ($registerJson.user.email -eq $email) "Registered user email mismatch"

$headers = @{
    Authorization = "Bearer $accessToken"
}

Write-Host "Registered successfully."

# /auth/me
$meJson = Invoke-RestMethod `
    -Uri "http://localhost:8080/api/v1/auth/me" `
    -Method GET `
    -Headers $headers

Assert-True ($meJson.email -eq $email) "/auth/me email mismatch"

# /profile
$profileJson = Invoke-RestMethod `
    -Uri "http://localhost:8080/api/v1/profile" `
    -Method GET `
    -Headers $headers

Assert-True ($null -ne $profileJson.user_id) "Profile missing user_id"
Assert-True ($profileJson.user_id -eq $meJson.id) "Profile user_id mismatch"

# /home/summary
$homeJson = Invoke-RestMethod `
    -Uri "http://localhost:8080/api/v1/home/summary" `
    -Method GET `
    -Headers $headers

Assert-True ($null -ne $homeJson.period_start) "Home summary missing period_start"
Assert-True ($null -ne $homeJson.period_end) "Home summary missing period_end"

# /category-budgets
$budgetsJson = Invoke-RestMethod `
    -Uri "http://localhost:8080/api/v1/category-budgets" `
    -Method GET `
    -Headers $headers

Assert-True ($null -ne $budgetsJson.category_budgets) "Category budgets missing category_budgets array"

# /categories
$categoriesJson = Invoke-RestMethod `
    -Uri "http://localhost:8080/api/v1/categories" `
    -Method GET `
    -Headers $headers

$categories = $categoriesJson.categories
Assert-True ($null -ne $categories) "Categories missing categories array"
Assert-True ($categories.Count -gt 0) "No categories returned for new user"

$firstBudgetable = $categories | Where-Object { $_.counts_toward_budget -eq $true } | Select-Object -First 1
Assert-True ($null -ne $firstBudgetable) "No budgetable category found"

# Create transaction
$txBody = @{
    category_id = $firstBudgetable.id
    amount_cents = 1234
    transaction_type = "expense"
    transaction_date = (Get-Date).ToString("yyyy-MM-dd")
    merchant_name = "Smoke Test"
    note = "Created by smoke test"
} | ConvertTo-Json

$txJson = Invoke-RestMethod `
    -Uri "http://localhost:8080/api/v1/transactions" `
    -Method POST `
    -Headers $headers `
    -ContentType "application/json" `
    -Body $txBody

Assert-True ($null -ne $txJson.id) "Created transaction missing id"

# Transactions list
$transactionsJson = Invoke-RestMethod `
    -Uri "http://localhost:8080/api/v1/transactions" `
    -Method GET `
    -Headers $headers

Assert-True ($null -ne $transactionsJson.transactions) "Transactions list missing transactions array"
Assert-True ($transactionsJson.transactions.Count -ge 1) "Expected at least one transaction after creation"

# Analytics
$analyticsJson = Invoke-RestMethod `
    -Uri "http://localhost:8080/api/v1/analytics/summary" `
    -Method GET `
    -Headers $headers

Assert-True ($null -ne $analyticsJson.total_expenses_cents) "Analytics missing total_expenses_cents"

# Refresh token
$refreshBody = @{
    refresh_token = $refreshToken
} | ConvertTo-Json

$refreshJson = Invoke-RestMethod `
    -Uri "http://localhost:8080/api/v1/auth/refresh" `
    -Method POST `
    -ContentType "application/json" `
    -Body $refreshBody

Assert-True (-not [string]::IsNullOrWhiteSpace($refreshJson.access_token)) "Refresh missing access token"
Assert-True (-not [string]::IsNullOrWhiteSpace($refreshJson.refresh_token)) "Refresh missing refresh token"

# Use refreshed token for a protected call
$refreshedHeaders = @{
    Authorization = "Bearer $($refreshJson.access_token)"
}

$meAfterRefresh = Invoke-RestMethod `
    -Uri "http://localhost:8080/api/v1/auth/me" `
    -Method GET `
    -Headers $refreshedHeaders

Assert-True ($meAfterRefresh.email -eq $email) "Refreshed token failed /auth/me"

# Close current period
$closeJson = Invoke-RestMethod `
    -Uri "http://localhost:8080/api/v1/periods/close-current" `
    -Method POST `
    -Headers $refreshedHeaders

Assert-True ($null -ne $closeJson.status) "Close current period missing status"

Write-Host ""
Write-Host "Smoke test passed." -ForegroundColor Green
Write-Host "User: $email"
Write-Host "Period: $($homeJson.period_start) to $($homeJson.period_end)"
Write-Host "Categories returned: $($categories.Count)"
Write-Host "Transactions returned: $($transactionsJson.transactions.Count)"