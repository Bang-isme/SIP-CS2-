param(
  [Parameter(Mandatory = $true)][string]$Name,
  [Parameter(Mandatory = $true)][int]$Port
)

$projectRoot = Split-Path -Parent $PSScriptRoot
$runDir = Join-Path $projectRoot "run"
$serviceKey = $Name.ToLower()
$pidFile = Join-Path $runDir "$serviceKey.pid"
$stdoutLog = Join-Path $runDir "$serviceKey.out.log"
$stderrLog = Join-Path $runDir "$serviceKey.err.log"

$listening = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue |
  Where-Object { $_.State -eq "Listen" } |
  Select-Object -First 1

[PSCustomObject]@{
  Name = $Name
  Running = [bool]$listening
  Port = $Port
  OwningProcess = if ($listening) { $listening.OwningProcess } else { $null }
  PidFile = if (Test-Path $pidFile) { Get-Content $pidFile | Select-Object -First 1 } else { $null }
  StdoutLog = $stdoutLog
  StderrLog = $stderrLog
} | Format-List
