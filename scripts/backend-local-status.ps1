$projectRoot = Split-Path -Parent $PSScriptRoot
$runDir = Join-Path $projectRoot "run"
$pidFile = Join-Path $runDir "backend.pid"
$stdoutLog = Join-Path $runDir "backend.out.log"
$stderrLog = Join-Path $runDir "backend.err.log"

$listening = Get-NetTCPConnection -LocalPort 4000 -ErrorAction SilentlyContinue |
  Where-Object { $_.State -eq "Listen" } |
  Select-Object -First 1

[PSCustomObject]@{
  Running = [bool]$listening
  Port = 4000
  OwningProcess = if ($listening) { $listening.OwningProcess } else { $null }
  PidFile = if (Test-Path $pidFile) { Get-Content $pidFile | Select-Object -First 1 } else { $null }
  StdoutLog = $stdoutLog
  StderrLog = $stderrLog
} | Format-List
