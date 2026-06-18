# Career Intelligence Studio (CIS) Startup Rollback
# This script completely removes the startup configuration.

$ProjectDir = "c:\Users\rajaj\Projects\CV and Interview Prep Builder"
$StartupDir = "$ProjectDir\scripts\startup"
$TaskName = "CareerIntelligenceStudioStartup"

Write-Output "Removing Career Intelligence Studio Startup Configuration..."

# 1. Unregister Task Scheduler task
try {
    $Task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    if ($Task -ne $null) {
        Write-Output "Unregistering Task Scheduler task '$TaskName'..."
        Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction Stop
        Write-Output "Successfully removed Task Scheduler task."
    } else {
        Write-Output "Task Scheduler task '$TaskName' does not exist."
    }
} catch {
    Write-Output "Failed to remove Task Scheduler task: $_"
}

# 2. Remove Startup Folder shortcut
try {
    $StartupFolder = "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup"
    $ShortcutPath = "$StartupFolder\CareerIntelligenceStudio.lnk"
    
    if (Test-Path $ShortcutPath) {
        Write-Output "Deleting Startup shortcut from: $ShortcutPath"
        Remove-Item -Path $ShortcutPath -Force -ErrorAction Stop
        Write-Output "Successfully removed Startup shortcut."
    } else {
        Write-Output "Startup shortcut does not exist."
    }
} catch {
    Write-Output "Failed to remove Startup shortcut: $_"
}

# 3. Clean up log files
try {
    $Logs = @(
        "$StartupDir\startup.log",
        "$StartupDir\api_startup.log",
        "$StartupDir\web_startup.log"
    )
    
    foreach ($Log in $Logs) {
        if (Test-Path $Log) {
            Write-Output "Deleting log file: $Log"
            Remove-Item -Path $Log -Force
        }
    }
} catch {
    Write-Output "Failed to clean up log files: $_"
}

Write-Output "Rollback completed. The application will no longer start automatically on logon."
