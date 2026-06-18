# Career Intelligence Studio (CIS) Startup Installer
# This script configures the automatic boot startup for the current user.

$ProjectDir = "c:\Users\rajaj\Projects\CV and Interview Prep Builder"
$StartupScript = "$ProjectDir\scripts\startup\start_cis.ps1"
$TaskName = "CareerIntelligenceStudioStartup"

Write-Output "Installing Career Intelligence Studio Startup Configuration..."

# 1. Verify that the startup script exists
if (-not (Test-Path $StartupScript)) {
    Write-Error "Startup script not found at: $StartupScript"
    Exit 1
}

# 2. Try to register in Windows Task Scheduler (Current User Logon Trigger)
$SchedulerSuccess = $false
try {
    Write-Output "Attempting to register Windows Task Scheduler task '$TaskName'..."
    
    # Define scheduled task elements
    $Action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-WindowStyle Hidden -ExecutionPolicy Bypass -File `"$StartupScript`""
    $Trigger = New-ScheduledTaskTrigger -AtLogOn
    $Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
    
    # Register the task in current user context (no admin rights needed)
    $Task = Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings -Force -ErrorAction Stop
    
    if ($Task -ne $null) {
        $SchedulerSuccess = $true
        Write-Output "Successfully registered Windows Task Scheduler task: $TaskName"
        Write-Output "The application will run automatically in the background when you log in."
    }
} catch {
    Write-Output "Task Scheduler registration failed or is restricted: $_"
}

# 3. Fallback/Alternative: Create shortcut in Startup Folder
try {
    $StartupFolder = "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup"
    $ShortcutPath = "$StartupFolder\CareerIntelligenceStudio.lnk"
    
    Write-Output "Creating shortcut in current user Startup folder..."
    
    $WshShell = New-Object -ComObject WScript.Shell
    $Shortcut = $WshShell.CreateShortcut($ShortcutPath)
    $Shortcut.TargetPath = "powershell.exe"
    $Shortcut.Arguments = "-WindowStyle Hidden -ExecutionPolicy Bypass -File `"$StartupScript`""
    $Shortcut.WorkingDirectory = $ProjectDir
    $Shortcut.Description = "Starts Career Intelligence Studio Services and default browser on logon"
    $Shortcut.Save()
    
    if (Test-Path $ShortcutPath) {
        Write-Output "Successfully created Startup shortcut at: $ShortcutPath"
    } else {
        throw "Shortcut file was not created."
    }
} catch {
    Write-Error "Failed to configure Startup folder shortcut: $_"
}

Write-Output "Installation complete. Verification test recommended."
