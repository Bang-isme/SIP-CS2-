$projectRoot = Split-Path -Parent $PSScriptRoot
$saPort = if ($env:SA_PORT) { [int]$env:SA_PORT } else { 4000 }
& (Join-Path $projectRoot "scripts\case3-service-status.ps1") -Name "SA" -Port $saPort
