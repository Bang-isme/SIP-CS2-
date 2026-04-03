$taskName = "SIPLocalMongoDBAutostart"
$queryOutput = schtasks /Query /TN $taskName 2>&1
if ($LASTEXITCODE -ne 0) {
  Write-Output "Mongo local autostart task '$taskName' is not installed."
  exit 0
}

schtasks /Delete /TN $taskName /F | Out-Null
if ($LASTEXITCODE -ne 0) {
  throw "Failed to remove Mongo local autostart task '$taskName'."
}

Write-Output "Mongo local autostart task '$taskName' removed."
