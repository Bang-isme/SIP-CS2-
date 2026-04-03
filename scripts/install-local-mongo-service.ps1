$mongoRoot = "D:\MongoDB"
$mongod = Join-Path $mongoRoot "Server\8.2\bin\mongod.exe"
$config = Join-Path $mongoRoot "mongod.conf"
$pidFile = Join-Path $mongoRoot "run\mongod.pid"
$serviceName = "SIPLocalMongoDB"
$serviceDisplayName = "SIP Local MongoDB"
$serviceDescription = "MongoDB local service for SIP_CS2 local 500k dataset runtime"
$principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
$isAdmin = $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not (Test-Path $mongod)) {
  throw "mongod.exe not found at $mongod"
}

if (-not (Test-Path $config)) {
  throw "Mongo config not found at $config"
}

if (-not $isAdmin) {
  throw "Installing Windows service '$serviceName' requires an elevated PowerShell session. Run PowerShell as Administrator or use the no-admin fallback: npm run mongo:local:autostart:install"
}

$manualListener = Get-NetTCPConnection -LocalPort 27017 -ErrorAction SilentlyContinue |
  Where-Object { $_.State -eq "Listen" } |
  Select-Object -First 1

$service = Get-Service -Name $serviceName -ErrorAction SilentlyContinue

if ($manualListener -and -not $service) {
  Stop-Process -Id $manualListener.OwningProcess -Force
  Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
  Start-Sleep -Seconds 2
}

if ($service) {
  & $mongod --config $config --reinstall --serviceName $serviceName --serviceDisplayName $serviceDisplayName --serviceDescription $serviceDescription
} else {
  & $mongod --config $config --install --serviceName $serviceName --serviceDisplayName $serviceDisplayName --serviceDescription $serviceDescription
}

if ($LASTEXITCODE -ne 0) {
  throw "Failed to install or reinstall MongoDB Windows service '$serviceName'."
}

Set-Service -Name $serviceName -StartupType Automatic
Start-Service -Name $serviceName

for ($i = 0; $i -lt 30; $i++) {
  Start-Sleep -Seconds 1
  $service = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
  if ($service -and $service.Status -eq "Running") {
    Write-Output "MongoDB Windows service '$serviceName' installed and running with Automatic startup."
    exit 0
  }
}

throw "MongoDB Windows service '$serviceName' did not reach Running state in time."
