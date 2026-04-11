param(
    [string]$ConfigPath = '.\scripts\seed-dev-data.json',
    [switch]$AlsoClearCompanyAssets
)

$ErrorActionPreference = 'Stop'

function Convert-ToSqlList {
    param([string[]]$Values)

    if (-not $Values -or $Values.Count -eq 0) {
        return "''"
    }

    $escaped = $Values | ForEach-Object { "'" + ($_ -replace "'", "''") + "'" }
    return ($escaped -join ', ')
}

if (-not (Test-Path -Path $ConfigPath)) {
    throw "Seed config not found at path: $ConfigPath"
}

$config = Get-Content -Path $ConfigPath -Raw | ConvertFrom-Json
$seafarerEmails = @($config.seafarers | ForEach-Object { [string]$_.email })
$vesselNames = @($config.vessels | ForEach-Object { [string]$_.name })
$companyEmail = [string]$config.company.email

$seafarerEmailsSql = Convert-ToSqlList -Values $seafarerEmails
$vesselNamesSql = Convert-ToSqlList -Values $vesselNames
$companyEmailSql = Convert-ToSqlList -Values @($companyEmail)
$userDbRoot = 'c:\Riki\products\portal\demo\Leto\User database'

$seedUserIdsRaw = docker compose -f "c:\Riki\products\portal\demo\Leto\docker-compose.yml" exec -T postgres psql -U leto_user -d leto_db -At -c "SELECT id FROM users WHERE email IN ($seafarerEmailsSql);"
$seedUserIds = @($seedUserIdsRaw -split "`r?`n" | Where-Object { $_ -and $_.Trim().Length -gt 0 } | ForEach-Object { $_.Trim() })

$companyUserIds = @()
if ($AlsoClearCompanyAssets.IsPresent) {
    $companyUserIdsRaw = docker compose -f "c:\Riki\products\portal\demo\Leto\docker-compose.yml" exec -T postgres psql -U leto_user -d leto_db -At -c "SELECT id FROM users WHERE email IN ($companyEmailSql);"
    $companyUserIds = @($companyUserIdsRaw -split "`r?`n" | Where-Object { $_ -and $_.Trim().Length -gt 0 } | ForEach-Object { $_.Trim() })
}

$sql = @"
BEGIN;

WITH seed_users AS (
    SELECT id FROM users WHERE email IN ($seafarerEmailsSql)
)
DELETE FROM assignments WHERE seafarer_id IN (SELECT id FROM seed_users);

DELETE FROM seafarers WHERE id IN (SELECT id FROM users WHERE email IN ($seafarerEmailsSql));
DELETE FROM users WHERE email IN ($seafarerEmailsSql);
"@

if ($AlsoClearCompanyAssets.IsPresent) {
    $sql += @"

WITH target_company AS (
    SELECT company_id AS id FROM users WHERE email IN ($companyEmailSql) LIMIT 1
)
DELETE FROM assignments WHERE company_id IN (SELECT id FROM target_company);

WITH target_company AS (
    SELECT company_id AS id FROM users WHERE email IN ($companyEmailSql) LIMIT 1
)
DELETE FROM vessels WHERE company_id IN (SELECT id FROM target_company) AND name IN ($vesselNamesSql);

DELETE FROM companies WHERE id IN (SELECT company_id FROM users WHERE email IN ($companyEmailSql));
DELETE FROM users WHERE email IN ($companyEmailSql);
"@
}

$sql += @"

COMMIT;
"@

docker compose -f "c:\Riki\products\portal\demo\Leto\docker-compose.yml" exec -T postgres psql -U leto_user -d leto_db -c $sql

$allUserIdsToPurge = @($seedUserIds + $companyUserIds | Select-Object -Unique)
foreach ($uid in $allUserIdsToPurge) {
    $userFolder = Join-Path $userDbRoot $uid
    if (Test-Path -Path $userFolder) {
        Remove-Item -Path $userFolder -Recurse -Force
    }
}

Write-Host 'Seed cleanup completed.'
Write-Host "Removed seeded seafarers: $($seafarerEmails.Count)"
Write-Host "Removed seeded user data folders: $($allUserIdsToPurge.Count)"
if ($AlsoClearCompanyAssets.IsPresent) {
    Write-Host 'Also removed seeded company assets and company account.'
}
