$projectRoot = Split-Path -Parent $PSScriptRoot
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$outputRoot = Join-Path $projectRoot "dist\homework-sso-submission\$timestamp"
$stageRoot = Join-Path $outputRoot "source"
$repoName = Split-Path $projectRoot -Leaf
$stageRepo = Join-Path $stageRoot $repoName
$zipPath = Join-Path $outputRoot "$repoName-homework-sso.zip"
$manifestPath = Join-Path $outputRoot "submission-manifest.txt"

$excludeDirNames = @(
  ".git",
  ".agent",
  ".codex",
  ".codexai-backups",
  ".playwright-cli",
  "node_modules",
  "dist",
  "coverage",
  "test-results"
)

$excludePathFragments = @(
  "\docs\demo\evidence\",
  "\docs\homework-sso-assets\video\raw\",
  "\docs\homework-sso-assets\video\raw-debug",
  "\dashboard\dist\",
  "\.codex\cache\"
)

$excludeFileNames = @(
  ".DS_Store",
  ".env",
  ".env.atlas.backup"
)

function Test-ShouldExcludeFile {
  param(
    [string]$FullName
  )

  foreach ($fragment in $excludePathFragments) {
    if ($FullName -like "*$fragment*") {
      return $true
    }
  }

  return $false
}

function Ensure-Directory {
  param(
    [string]$Path
  )

  if (-not (Test-Path -LiteralPath $Path)) {
    New-Item -ItemType Directory -Path $Path | Out-Null
  }
}

if (Test-Path -LiteralPath $outputRoot) {
  Remove-Item -LiteralPath $outputRoot -Recurse -Force
}

Ensure-Directory $outputRoot
Ensure-Directory $stageRepo

$allFiles = Get-ChildItem -LiteralPath $projectRoot -Recurse -File -Force | Where-Object {
  $fullName = $_.FullName
  $fileName = $_.Name
  $shouldExclude = $false

  foreach ($segment in $excludeDirNames) {
    if ($fullName -like "*\$segment\*") {
      $shouldExclude = $true
      break
    }
  }

  if (-not $shouldExclude) {
    foreach ($name in $excludeFileNames) {
      if ($fileName -ieq $name) {
        $shouldExclude = $true
        break
      }
    }
  }

  if (-not $shouldExclude -and (Test-ShouldExcludeFile -FullName $fullName)) {
    $shouldExclude = $true
  }

  -not $shouldExclude
}

foreach ($file in $allFiles) {
  $relativePath = $file.FullName.Substring($projectRoot.Length).TrimStart('\')
  $targetPath = Join-Path $stageRepo $relativePath
  $targetDir = Split-Path -Parent $targetPath
  Ensure-Directory $targetDir
  Copy-Item -LiteralPath $file.FullName -Destination $targetPath -Force
}

$manifestLines = @(
  "Homework SSO submission package",
  "Generated: $(Get-Date -Format s)",
  "Project root: $projectRoot",
  "Staged source: $stageRepo",
  "",
  "Included docs:",
  "- docs\homework_sso_report_vi.md",
  "- docs\homework_sso_report_outline_vi.md",
  "- docs\homework_sso_video_script_vi.md",
  "- docs\homework_sso_gap_audit_vi.md",
  "- docs\homework_sso_completion_audit_vi.md",
  "- docs\homework_sso_submission_checklist_vi.md",
  "- docs\homework_sso_submission_readme_vi.md",
  "- docs\homework_sso_viva_talking_points_vi.md",
  "",
  "Excluded directories:",
  ($excludeDirNames | ForEach-Object { "- $_" }),
  "",
  "Excluded files:",
  ($excludeFileNames | ForEach-Object { "- $_" }),
  "",
  "Excluded path fragments:",
  ($excludePathFragments | ForEach-Object { "- $_" })
)

Set-Content -LiteralPath $manifestPath -Value $manifestLines -Encoding UTF8

if (Test-Path -LiteralPath $zipPath) {
  Remove-Item -LiteralPath $zipPath -Force
}

Compress-Archive -Path $stageRepo -DestinationPath $zipPath -CompressionLevel Optimal

Write-Output "Homework SSO package created:"
Write-Output "  Stage: $stageRepo"
Write-Output "  Zip:   $zipPath"
Write-Output "  Note:  $manifestPath"
