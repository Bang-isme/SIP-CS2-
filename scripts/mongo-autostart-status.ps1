$taskName = "SIPLocalMongoDBAutostart"
$queryOutput = schtasks /Query /TN $taskName /V /FO LIST 2>&1

if ($LASTEXITCODE -ne 0) {
  Write-Output "Mongo local autostart task '$taskName' is not installed."
  exit 0
}

$queryOutput
