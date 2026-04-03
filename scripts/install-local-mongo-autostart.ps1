$taskName = "SIPLocalMongoDBAutostart"
$scriptPath = "D:\SIP_CS 2\SIP_CS\scripts\start-local-mongo.ps1"
$powerShellExe = Join-Path $env:SystemRoot "System32\WindowsPowerShell\v1.0\powershell.exe"
$escapedScriptPath = $scriptPath.Replace("'", "''")
$currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name

if (-not (Test-Path $scriptPath)) {
  throw "Mongo autostart script not found at $scriptPath"
}

$taskAction = New-ScheduledTaskAction -Execute $powerShellExe -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$scriptPath`""
$taskTrigger = New-ScheduledTaskTrigger -AtLogOn -User $currentUser
$taskSettings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
$taskPrincipal = New-ScheduledTaskPrincipal -UserId $currentUser -LogonType Interactive -RunLevel Limited

Register-ScheduledTask `
  -TaskName $taskName `
  -Action $taskAction `
  -Trigger $taskTrigger `
  -Settings $taskSettings `
  -Principal $taskPrincipal `
  -Force | Out-Null

Write-Output "Mongo local autostart scheduled task '$taskName' installed for user $currentUser."
