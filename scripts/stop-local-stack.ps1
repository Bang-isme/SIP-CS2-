$projectRoot = Split-Path -Parent $PSScriptRoot

& (Join-Path $projectRoot "scripts\stop-local-backend.ps1")
& (Join-Path $projectRoot "scripts\stop-local-mongo.ps1")

Write-Output "Local stack stop command finished."
