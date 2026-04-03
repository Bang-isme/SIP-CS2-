$serviceName = "SIPLocalMongoDB"
$service = Get-Service -Name $serviceName -ErrorAction SilentlyContinue

if (-not $service) {
  Write-Output "MongoDB Windows service '$serviceName' is not installed."
  exit 0
}

$listening = Get-NetTCPConnection -LocalPort 27017 -ErrorAction SilentlyContinue |
  Where-Object { $_.State -eq "Listen" } |
  Select-Object -First 1

[PSCustomObject]@{
  ServiceName = $service.Name
  DisplayName = $service.DisplayName
  Status = $service.Status
  StartType = $service.StartType
  ListeningOn27017 = [bool]$listening
  OwningProcess = if ($listening) { $listening.OwningProcess } else { $null }
} | Format-List
