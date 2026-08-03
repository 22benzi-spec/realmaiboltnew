[CmdletBinding()]
param(
    [switch]$Force
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$repoRoot = (& git rev-parse --show-toplevel).Trim()
if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($repoRoot)) {
    throw 'The current directory is not inside a Git repository.'
}

$source = Join-Path $repoRoot '.githooks/pre-push'
$target = Join-Path $repoRoot '.git/hooks/pre-push'

if (-not (Test-Path -LiteralPath $source)) {
    throw "Project hook not found: $source"
}

if ((Test-Path -LiteralPath $target) -and -not $Force) {
    $existing = Get-Content -LiteralPath $target -Raw
    if ($existing -notmatch 'realmaiboltnew-push-document-hook') {
        throw 'An existing pre-push hook was found. Merge it manually or rerun with -Force.'
    }
}

Copy-Item -LiteralPath $source -Destination $target -Force
Write-Host "Installed Git pre-push hook: $target"
