# Career Intelligence Studio (CIS) Startup Orchestrator
# This script starts the backend and frontend, performs health checks, and opens the default browser.

# ----------------------------------------------------
# Configuration
# ----------------------------------------------------
$ProjectDir = "c:\Users\rajaj\Projects\CV and Interview Prep Builder"
$StartupDir = "$ProjectDir\scripts\startup"
$LogFile = "$StartupDir\startup.log"
$ApiLog = "$StartupDir\api_startup.log"
$WebLog = "$StartupDir\web_startup.log"
$GatewayLog = "$StartupDir\gateway_startup.log"

$ApiUrl = "http://127.0.0.1:8000/"
$WebUrl = "http://127.0.0.1:3000/"
$GatewayUrl = "http://127.0.0.1:8001/"

$MaxRetries = 30 # 60 seconds total timeout (30 * 2s)
$RetryInterval = 2

# Ensure startup directory and logs folder exist
New-Item -ItemType Directory -Force -Path $StartupDir | Out-Null
New-Item -ItemType Directory -Force -Path "$ProjectDir\data\logs" -ErrorAction SilentlyContinue | Out-Null

# Logging Helper
function Log-Message([string]$Message, [string]$Level = "INFO") {
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $LogEntry = "[$Timestamp] [$Level] $Message"
    Write-Output $LogEntry
    Add-Content -Path $LogFile -Value $LogEntry
}

Log-Message "=================================================="
Log-Message "CIS Auto-Startup Initiated."
Log-Message "Project Directory: $ProjectDir"

# ----------------------------------------------------
# Port Availability Checks
# ----------------------------------------------------
function Test-PortInUse([int]$Port) {
    $Connections = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    return ($Connections -ne $null)
}

$ApiAlreadyRunning = Test-PortInUse 8000
$WebAlreadyRunning = Test-PortInUse 3000
$GatewayAlreadyRunning = Test-PortInUse 8001

# ----------------------------------------------------
# Startup API Backend (FastAPI)
# ----------------------------------------------------
if ($ApiAlreadyRunning) {
    Log-Message "Port 8000 is already in use. Assuming API is running."
} else {
    Log-Message "Starting API Backend (FastAPI) on port 8000..."
    $ApiVenvPath = "$ProjectDir\apps\api\.venv\Scripts\uvicorn.exe"
    if (-not (Test-Path $ApiVenvPath)) {
        Log-Message "API Virtual Environment not found at $ApiVenvPath. Aborting startup." "ERROR"
        Exit 1
    }
    
    # Run Uvicorn in a background PowerShell process
    $ApiArguments = "-NoProfile -Command `"`$env:PYTHONPATH='$ProjectDir'; & '$ApiVenvPath' apps.api.src.main:app --port 8000 --host 127.0.0.1 *>`'$ApiLog`'`""
    $ApiProcess = Start-Process -FilePath "powershell.exe" -ArgumentList $ApiArguments -WorkingDirectory $ProjectDir -WindowStyle Hidden -PassThru
    
    if ($ApiProcess -eq $null) {
        Log-Message "Failed to start API process." "ERROR"
        Exit 1
    }
    Log-Message "API Process started in background (PID: $($ApiProcess.Id)). Log: $ApiLog"
}

# ----------------------------------------------------
# Startup AI Gateway (uvicorn)
# ----------------------------------------------------
if ($GatewayAlreadyRunning) {
    Log-Message "Port 8001 is already in use. Assuming AI Gateway is running."
} else {
    Log-Message "Starting AI Gateway on port 8001..."
    $ApiVenvPath = "$ProjectDir\apps\api\.venv\Scripts\uvicorn.exe"
    if (-not (Test-Path $ApiVenvPath)) {
        Log-Message "Gateway Virtual Environment (using API venv) not found at $ApiVenvPath. Aborting startup." "ERROR"
        Exit 1
    }
    
    # Run Uvicorn in a background PowerShell process for AI Gateway
    $GatewayArguments = "-NoProfile -Command `"`$env:PYTHONPATH='$ProjectDir'; & '$ApiVenvPath' ai_gateway.main:app --port 8001 --host 127.0.0.1 *>`'$GatewayLog`'`""
    $GatewayProcess = Start-Process -FilePath "powershell.exe" -ArgumentList $GatewayArguments -WorkingDirectory $ProjectDir -WindowStyle Hidden -PassThru
    
    if ($GatewayProcess -eq $null) {
        Log-Message "Failed to start AI Gateway process." "ERROR"
        Exit 1
    }
    Log-Message "AI Gateway Process started in background (PID: $($GatewayProcess.Id)). Log: $GatewayLog"
}

# ----------------------------------------------------
# Startup Web Frontend (Next.js)
# ----------------------------------------------------
if ($WebAlreadyRunning) {
    Log-Message "Port 3000 is already in use. Assuming Web Frontend is running."
} else {
    Log-Message "Starting Web Frontend (Next.js) on port 3000..."
    
    # Run pnpm dev in a background PowerShell process
    $WebArguments = "-NoProfile -Command `"pnpm run dev *>`'$WebLog`'`""
    $WebProcess = Start-Process -FilePath "powershell.exe" -ArgumentList $WebArguments -WorkingDirectory $ProjectDir -WindowStyle Hidden -PassThru
    
    if ($WebProcess -eq $null) {
        Log-Message "Failed to start Web Frontend process." "ERROR"
        Exit 1
    }
    Log-Message "Web Process started in background (PID: $($WebProcess.Id)). Log: $WebLog"
}

# ----------------------------------------------------
# Health Check Loop
# ----------------------------------------------------
Log-Message "Waiting for services to become responsive..."
$ApiHealthy = $false
$WebHealthy = $false
$GatewayHealthy = $false

for ($i = 1; $i -le $MaxRetries; $i++) {
    # Check API health
    if (-not $ApiHealthy) {
        try {
            $Response = Invoke-WebRequest -Uri $ApiUrl -UseBasicParsing -TimeoutSec 2 -ErrorAction SilentlyContinue
            if ($Response -and $Response.StatusCode -eq 200) {
                $ApiHealthy = $true
                Log-Message "API backend is healthy and responsive."
            }
        } catch {
            # Not healthy yet
        }
    }
    
    # Check Gateway health
    if (-not $GatewayHealthy) {
        try {
            $Response = Invoke-WebRequest -Uri $GatewayUrl -UseBasicParsing -TimeoutSec 2 -ErrorAction SilentlyContinue
            if ($Response -and $Response.StatusCode -eq 200) {
                $GatewayHealthy = $true
                Log-Message "AI Gateway is healthy and responsive."
            }
        } catch {
            # Not healthy yet
        }
    }
    
    # Check Web health
    if (-not $WebHealthy) {
        try {
            $Response = Invoke-WebRequest -Uri $WebUrl -UseBasicParsing -TimeoutSec 2 -ErrorAction SilentlyContinue
            if ($Response -and $Response.StatusCode -eq 200) {
                $WebHealthy = $true
                Log-Message "Web frontend is healthy and responsive."
            }
        } catch {
            # Not healthy yet
        }
    }
    
    if ($ApiHealthy -and $WebHealthy -and $GatewayHealthy) {
        break
    }
    
    Log-Message "Retrying health check in $RetryInterval seconds (Attempt $i/$MaxRetries)..."
    Start-Sleep -Seconds $RetryInterval
}

if (-not ($ApiHealthy -and $WebHealthy -and $GatewayHealthy)) {
    Log-Message "Startup timed out or one or more services failed to start. API: $ApiHealthy, Web: $WebHealthy, Gateway: $GatewayHealthy" "WARNING"
}

# ----------------------------------------------------
# Launch Default Browser
# ----------------------------------------------------
Log-Message "Opening Career Intelligence Studio in default system web browser..."
try {
    Start-Process $WebUrl
    Log-Message "Browser successfully launched pointing to $WebUrl."
} catch {
    Log-Message "Failed to automatically launch default browser: $_" "ERROR"
}

Log-Message "CIS Auto-Startup Completed."
Log-Message "=================================================="
