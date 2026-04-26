param(
  [Parameter(Mandatory = $true)][string]$Name,
  [Parameter(Mandatory = $true)][int]$Port
)

function Get-ExpectedEntryPointForService {
  param(
    [string]$ServiceName
  )

  switch ($ServiceName.ToLower()) {
    "sa" { return "src/sa-server.js" }
    "payroll" { return "src/payroll-server.js" }
    "dashboard" { return "src/dashboard-server.js" }
    default { return $null }
  }
}

function Get-ProcessCommandLine {
  param(
    [int]$ProcessId
  )

  $process = Get-CimInstance Win32_Process -Filter "ProcessId = $ProcessId" -ErrorAction SilentlyContinue
  return $process.CommandLine
}

$projectRoot = Split-Path -Parent $PSScriptRoot
$pidFile = Join-Path $projectRoot "run\$($Name.ToLower()).pid"
$preexistingFile = Join-Path $projectRoot "run\$($Name.ToLower()).preexisting"
$expectedEntryPoint = Get-ExpectedEntryPointForService -ServiceName $Name

function Wait-ForPortRelease {
  param(
    [int]$TargetPort,
    [int]$TargetPid,
    [int]$TimeoutSeconds = 15
  )

  for ($i = 0; $i -lt $TimeoutSeconds; $i++) {
    $currentListener = Get-NetTCPConnection -LocalPort $TargetPort -ErrorAction SilentlyContinue |
      Where-Object { $_.State -eq "Listen" } |
      Select-Object -First 1
    if (-not $currentListener -or [int]$currentListener.OwningProcess -ne [int]$TargetPid) {
      return $true
    }
    Start-Sleep -Seconds 1
  }

  return $false
}

$listening = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue |
  Where-Object { $_.State -eq "Listen" } |
  Select-Object -First 1

if (Test-Path $preexistingFile) {
  $preexistingPid = Get-Content $preexistingFile | Select-Object -First 1
  Remove-Item $preexistingFile -Force -ErrorAction SilentlyContinue
  if ($preexistingPid) {
    Write-Output "$Name was already running on port $Port (PID $preexistingPid); left it untouched."
  } else {
    Write-Output "$Name was already running on port $Port; left it untouched."
  }
  exit 0
}

if (Test-Path $pidFile) {
  $servicePid = Get-Content $pidFile | Select-Object -First 1
  if ($servicePid) {
    $process = Get-Process -Id $servicePid -ErrorAction SilentlyContinue
    if ($process) {
      $shouldStopPid = -not $listening -or [int]$servicePid -eq [int]$listening.OwningProcess
      if ($shouldStopPid) {
        Stop-Process -Id $servicePid -Force
        [void](Wait-ForPortRelease -TargetPort $Port -TargetPid ([int]$servicePid))
        Write-Output "Stopped $Name process PID $servicePid."
        Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
        exit 0
      }
    }
  }
  Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
}

if ($listening) {
  $commandLine = Get-ProcessCommandLine -ProcessId $listening.OwningProcess
  if ($expectedEntryPoint -and $commandLine -and $commandLine.Contains($expectedEntryPoint)) {
    Stop-Process -Id $listening.OwningProcess -Force
    [void](Wait-ForPortRelease -TargetPort $Port -TargetPid ([int]$listening.OwningProcess))
    Write-Output "Stopped $Name process PID $($listening.OwningProcess) via command-line ownership match."
    exit 0
  }

  Write-Output "$Name is listening on port $Port (PID $($listening.OwningProcess)) but is not owned by this stop script; leaving it untouched."
  exit 0
}

Write-Output "$Name is not running."
