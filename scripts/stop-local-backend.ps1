$projectRoot = Split-Path -Parent $PSScriptRoot
$saPort = if ($env:SA_PORT) { [int]$env:SA_PORT } else { 4000 }
& (Join-Path $projectRoot "scripts\stop-case3-service.ps1") -Name "SA" -Port $saPort
