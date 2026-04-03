$projectRoot = Split-Path -Parent $PSScriptRoot

& (Join-Path $projectRoot "scripts\start-local-mongo.ps1")
if ($LASTEXITCODE -ne 0) {
  throw "Failed to start local Mongo runtime."
}

& (Join-Path $projectRoot "scripts\start-local-backend.ps1")
if ($LASTEXITCODE -ne 0) {
  throw "Failed to start local backend runtime."
}

Write-Output "Local stack is ready: Mongo + backend."
