param(
    [string]$ApiBase = 'http://localhost:3000/api',
    [string]$CrewingApiBase = 'http://localhost:3000/crewing-api',
    [string]$ConfigPath = '.\scripts\seed-dev-data.json',
    [switch]$SkipAssignments
)

$ErrorActionPreference = 'Stop'

function Invoke-JsonRequest {
    param(
        [string]$Method,
        [string]$Url,
        [object]$Body = $null,
        [hashtable]$Headers = @{}
    )

    $params = @{
        Method = $Method
        Uri = $Url
        Headers = $Headers
    }

    if ($null -ne $Body) {
        $params.ContentType = 'application/json'
        $params.Body = ($Body | ConvertTo-Json -Depth 20)
    }

    return Invoke-RestMethod @params
}

function Login-User {
    param(
        [string]$Email,
        [string]$Password
    )

    return Invoke-JsonRequest -Method 'Post' -Url "$ApiBase/auth/login" -Body @{ email = $Email; password = $Password }
}

function Get-Me {
    param([string]$AccessToken)

    return Invoke-JsonRequest -Method 'Get' -Url "$ApiBase/auth/me" -Headers @{ Authorization = "Bearer $AccessToken" }
}

function Ensure-Company {
    param([object]$CompanySeed)

    try {
        return Login-User -Email $CompanySeed.email -Password $CompanySeed.password
    } catch {
        $registerBody = @{
            email = $CompanySeed.email
            password = $CompanySeed.password
            role = 'company'
            company_name = $CompanySeed.company_name
            country = $CompanySeed.country
            city = $CompanySeed.city
            sector = $CompanySeed.sector
            company_size = $CompanySeed.company_size
            vessels = @()
        }
        $null = Invoke-JsonRequest -Method 'Post' -Url "$ApiBase/auth/register" -Body $registerBody
        return Login-User -Email $CompanySeed.email -Password $CompanySeed.password
    }
}

function Ensure-Seafarer {
    param(
        [object]$SeafarerSeed,
        [string]$DefaultPassword
    )

    try {
        $login = Login-User -Email $SeafarerSeed.email -Password $DefaultPassword
        $profile = Get-Me -AccessToken $login.access_token
        return @{ created = $false; profile = $profile }
    } catch {
        $registerBody = @{
            email = $SeafarerSeed.email
            password = $DefaultPassword
            role = 'seafarer'
            first_name = $SeafarerSeed.first_name
            last_name = $SeafarerSeed.last_name
            nationality = $SeafarerSeed.nationality
            phone = $SeafarerSeed.phone
            rank = $SeafarerSeed.rank
            date_of_birth = $SeafarerSeed.date_of_birth
        }

        $null = Invoke-JsonRequest -Method 'Post' -Url "$ApiBase/auth/register" -Body $registerBody
        $login = Login-User -Email $SeafarerSeed.email -Password $DefaultPassword
        $profile = Get-Me -AccessToken $login.access_token
        return @{ created = $true; profile = $profile }
    }
}

function Get-Vessels {
    param(
        [string]$CompanyId,
        [string]$AccessToken
    )

    return @(Invoke-JsonRequest -Method 'Get' -Url "$ApiBase/companies/$CompanyId/vessels" -Headers @{ Authorization = "Bearer $AccessToken" })
}

function Ensure-Vessel {
    param(
        [string]$CompanyId,
        [string]$AccessToken,
        [object]$VesselSeed,
        [hashtable]$VesselsByName
    )

    if ($VesselsByName.ContainsKey($VesselSeed.name)) {
        return @{ created = $false; vessel = $VesselsByName[$VesselSeed.name] }
    }

    $body = @{
        name = $VesselSeed.name
        imo_number = $VesselSeed.imo_number
        vessel_type = $VesselSeed.vessel_type
        flag_state = $VesselSeed.flag_state
        gross_tonnage = $VesselSeed.gross_tonnage
    }
    $created = Invoke-JsonRequest -Method 'Post' -Url "$ApiBase/companies/$CompanyId/vessels" -Headers @{ Authorization = "Bearer $AccessToken" } -Body $body
    $VesselsByName[$created.name] = $created
    return @{ created = $true; vessel = $created }
}

function Get-Assignments {
    param(
        [string]$CompanyId,
        [string]$VesselId,
        [string]$AccessToken
    )

    return @(Invoke-JsonRequest -Method 'Get' -Url "$ApiBase/companies/$CompanyId/vessels/$VesselId/assignments" -Headers @{ Authorization = "Bearer $AccessToken" })
}

function Ensure-Assignment {
    param(
        [string]$CompanyId,
        [string]$VesselId,
        [string]$SeafarerId,
        [string]$AccessToken,
        [object]$AssignmentSeed,
        [array]$ExistingAssignments
    )

    $duplicate = $ExistingAssignments | Where-Object {
        $_.seafarer_id -eq $SeafarerId -and ($_.status -eq 'planned' -or $_.status -eq 'active')
    } | Select-Object -First 1

    if ($null -ne $duplicate) {
        return $false
    }

    $body = @{
        seafarer_id = $SeafarerId
        role_onboard = $AssignmentSeed.role_onboard
        embark_date = $AssignmentSeed.embark_date
        disembark_date = $AssignmentSeed.disembark_date
        status = $AssignmentSeed.status
    }
    $null = Invoke-JsonRequest -Method 'Post' -Url "$ApiBase/companies/$CompanyId/vessels/$VesselId/assignments" -Headers @{ Authorization = "Bearer $AccessToken" } -Body $body
    return $true
}

function Ensure-CrewingUser {
    param([string]$UserId)

    $null = Invoke-JsonRequest -Method 'Post' -Url "$CrewingApiBase/users/$UserId/init"
}

function Set-CalendarData {
    param(
        [string]$UserId,
        [array]$Availability
    )

    $payload = @{
        availability = @($Availability)
        confirmedInterviews = @()
    }

    $null = Invoke-JsonRequest -Method 'Put' -Url "$CrewingApiBase/users/$UserId/calendar" -Body $payload
}

if (-not (Test-Path -Path $ConfigPath)) {
    throw "Seed config not found at path: $ConfigPath"
}

$config = Get-Content -Path $ConfigPath -Raw | ConvertFrom-Json
$companySeed = $config.company
$defaultSeafarerPassword = [string]$config.default_seafarer_password

$companyLogin = Ensure-Company -CompanySeed $companySeed
$companyToken = $companyLogin.access_token
$companyMe = Get-Me -AccessToken $companyToken
$companyId = $companyMe.company_id

$vessels = Get-Vessels -CompanyId $companyId -AccessToken $companyToken
$vesselsByName = @{}
foreach ($v in $vessels) {
    $vesselsByName[$v.name] = $v
}

$createdVessels = 0
foreach ($vesselSeed in @($config.vessels)) {
    $result = Ensure-Vessel -CompanyId $companyId -AccessToken $companyToken -VesselSeed $vesselSeed -VesselsByName $vesselsByName
    if ($result.created) { $createdVessels++ }
}

$seafarersByEmail = @{}
$createdSeafarers = 0
$existingSeafarers = 0
foreach ($seed in @($config.seafarers)) {
    $result = Ensure-Seafarer -SeafarerSeed $seed -DefaultPassword $defaultSeafarerPassword
    $seafarersByEmail[$seed.email] = $result.profile
    if ($result.created) {
        $createdSeafarers++
    } else {
        $existingSeafarers++
    }
}

$createdAssignments = 0
if (-not $SkipAssignments.IsPresent) {
    foreach ($assignmentSeed in @($config.assignments)) {
        if (-not $vesselsByName.ContainsKey($assignmentSeed.vessel_name)) {
            Write-Host "Skipped assignment, vessel not found: $($assignmentSeed.vessel_name)"
            continue
        }
        if (-not $seafarersByEmail.ContainsKey($assignmentSeed.seafarer_email)) {
            Write-Host "Skipped assignment, seafarer not found: $($assignmentSeed.seafarer_email)"
            continue
        }

        $vessel = $vesselsByName[$assignmentSeed.vessel_name]
        $seafarer = $seafarersByEmail[$assignmentSeed.seafarer_email]
        $existing = Get-Assignments -CompanyId $companyId -VesselId $vessel.id -AccessToken $companyToken
        $created = Ensure-Assignment -CompanyId $companyId -VesselId $vessel.id -SeafarerId $seafarer.id -AccessToken $companyToken -AssignmentSeed $assignmentSeed -ExistingAssignments $existing
        if ($created) { $createdAssignments++ }
    }
}

$seededCalendarUsers = 0
$calendarEntries = 0
if ($null -ne $config.calendar_seed) {
    foreach ($calendarSeedEntry in $config.calendar_seed.PSObject.Properties) {
        $email = [string]$calendarSeedEntry.Name
        if (-not $seafarersByEmail.ContainsKey($email)) {
            Write-Host "Skipped calendar seed, seafarer not found: $email"
            continue
        }

        $seafarerProfile = $seafarersByEmail[$email]
        $userId = [string]$seafarerProfile.id
        $availability = @($calendarSeedEntry.Value)

        Ensure-CrewingUser -UserId $userId
        Set-CalendarData -UserId $userId -Availability $availability

        $seededCalendarUsers++
        $calendarEntries += $availability.Count
    }
}

Write-Host 'Seed completed successfully'
Write-Host "Company: $($companyMe.company_name) <$($companyMe.email)>"
Write-Host "Created vessels: $createdVessels"
Write-Host "Created seafarers: $createdSeafarers"
Write-Host "Existing seafarers reused: $existingSeafarers"
Write-Host "Created assignments: $createdAssignments"
Write-Host "Seeded calendar users: $seededCalendarUsers"
Write-Host "Seeded calendar entries: $calendarEntries"
Write-Host "Company login: $($companySeed.email) / $($companySeed.password)"
Write-Host "Seafarer default password: $defaultSeafarerPassword"
Write-Host "QA seafarer login: qa.seafarer@leto.com / $defaultSeafarerPassword"
