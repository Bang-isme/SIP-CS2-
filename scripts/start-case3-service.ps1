param(
  [Parameter(Mandatory = $true)][string]$Name,
  [Parameter(Mandatory = $true)][int]$Port,
  [Parameter(Mandatory = $true)][string]$EntryPoint,
  [int]$StartupTimeoutSeconds = 40
)

function Get-ProcessCommandLine {
  param(
    [int]$ProcessId
  )

  $process = Get-CimInstance Win32_Process -Filter "ProcessId = $ProcessId" -ErrorAction SilentlyContinue
  return $process.CommandLine
}

$projectRoot = Split-Path -Parent $PSScriptRoot
$runDir = Join-Path $projectRoot "run"
$serviceKey = $Name.ToLower()
$pidFile = Join-Path $runDir "$serviceKey.pid"
$preexistingFile = Join-Path $runDir "$serviceKey.preexisting"
$stdoutLog = Join-Path $runDir "$serviceKey.out.log"
$stderrLog = Join-Path $runDir "$serviceKey.err.log"

New-Item -ItemType Directory -Force -Path $runDir | Out-Null

$existing = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue |
  Where-Object { $_.State -eq "Listen" } |
  Select-Object -First 1

if ($existing) {
  $trackedPid = $null
  if (Test-Path $pidFile) {
    $trackedPid = Get-Content $pidFile | Select-Object -First 1
  }
  $commandLine = Get-ProcessCommandLine -ProcessId $existing.OwningProcess

  if (
    ($trackedPid -and [int]$trackedPid -eq [int]$existing.OwningProcess) -or
    ($commandLine -and $commandLine.Contains($EntryPoint))
  ) {
    Set-Content -Path $pidFile -Value $existing.OwningProcess
    Remove-Item $preexistingFile -Force -ErrorAction SilentlyContinue
    Write-Output "$Name already listening on port $Port (managed PID $($existing.OwningProcess))."
    exit 0
  }

  Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
  Set-Content -Path $preexistingFile -Value $existing.OwningProcess
  Write-Output "$Name already listening on port $Port (preexisting PID $($existing.OwningProcess))."
  exit 0
}

Remove-Item $preexistingFile -Force -ErrorAction SilentlyContinue
Remove-Item $pidFile -Force -ErrorAction SilentlyContinue

$process = Start-Process -FilePath "node" `
  -ArgumentList @($EntryPoint) `
  -WorkingDirectory $projectRoot `
  -RedirectStandardOutput $stdoutLog `
  -RedirectStandardError $stderrLog `
  -WindowStyle Hidden `
  -PassThru

Set-Content -Path $pidFile -Value $process.Id

$ready = $false
for ($i = 0; $i -lt $StartupTimeoutSeconds; $i++) {
  Start-Sleep -Seconds 1
  $listening = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue |
    Where-Object { $_.State -eq "Listen" } |
    Select-Object -First 1
  if ($listening) {
    $ready = $true
    break
  }
}

if (-not $ready) {
  throw "$Name did not start listening on port $Port within ${StartupTimeoutSeconds}s. Check $stderrLog"
}

Write-Output "$Name started on http://127.0.0.1:$Port (PID $($process.Id))."
