[CmdletBinding()]
param(
    [string]$Remote = 'origin',
    [string]$Branch,
    [string]$Summary,
    [string]$Verification,
    [string]$SummaryFile,
    [string]$VerificationFile
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

# Force UTF-8 so Chinese commit subjects / paths are not mojibake on Windows.
$utf8NoBom = [System.Text.UTF8Encoding]::new($false)
$utf8Bom = [System.Text.UTF8Encoding]::new($true)
[Console]::InputEncoding = $utf8NoBom
[Console]::OutputEncoding = $utf8NoBom
$OutputEncoding = $utf8NoBom
$env:LANG = 'C.UTF-8'
$env:LC_ALL = 'C.UTF-8'

function Read-Utf8Text {
    param([Parameter(Mandatory = $true)][string]$Path)
    if (-not (Test-Path -LiteralPath $Path)) {
        throw "File not found: $Path"
    }
    return [System.IO.File]::ReadAllText((Resolve-Path -LiteralPath $Path), $utf8NoBom).Trim()
}

if (-not [string]::IsNullOrWhiteSpace($SummaryFile)) {
    $Summary = Read-Utf8Text -Path $SummaryFile
}
if (-not [string]::IsNullOrWhiteSpace($VerificationFile)) {
    $Verification = Read-Utf8Text -Path $VerificationFile
}

if ([string]::IsNullOrWhiteSpace($Summary)) {
    throw 'Provide -Summary or -SummaryFile.'
}
if ([string]::IsNullOrWhiteSpace($Verification)) {
    throw 'Provide -Verification or -VerificationFile.'
}

function Invoke-Git {
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$Arguments
    )

    $output = & git -c core.quotepath=false -c i18n.logOutputEncoding=utf-8 @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "Git command failed: git $($Arguments -join ' ')"
    }
    return $output
}

$repoRoot = (Invoke-Git -Arguments @('rev-parse', '--show-toplevel')).Trim()
Set-Location -LiteralPath $repoRoot

if ([string]::IsNullOrWhiteSpace($Branch)) {
    $Branch = (Invoke-Git -Arguments @('branch', '--show-current')).Trim()
}
if ([string]::IsNullOrWhiteSpace($Branch)) {
    throw 'Detached HEAD detected. Pass -Branch explicitly.'
}

Invoke-Git -Arguments @('remote', 'get-url', $Remote) | Out-Null

$workingTree = @(& git status --porcelain)
if ($LASTEXITCODE -ne 0) {
    throw 'Unable to read the Git working tree status.'
}
if ($workingTree.Count -gt 0) {
    throw 'The working tree is not clean. Commit the code changes before creating a push document.'
}

$remoteRef = "refs/remotes/$Remote/$Branch"
& git show-ref --verify --quiet $remoteRef
$remoteBranchExists = $LASTEXITCODE -eq 0

if ($remoteBranchExists) {
    $range = "$Remote/$Branch..HEAD"
    $commits = @(Invoke-Git -Arguments @('log', '--reverse', '--format=- `%h` %s', $range))
    $files = @(Invoke-Git -Arguments @('diff', '--name-status', $range))
}
else {
    $commits = @(Invoke-Git -Arguments @('log', '--reverse', '--format=- `%h` %s'))
    $files = @(Invoke-Git -Arguments @('ls-tree', '-r', '--name-only', 'HEAD'))
}

if ($commits.Count -eq 0) {
    throw "Branch $Branch has no commits waiting to be pushed."
}

$timestamp = Get-Date -Format 'yyyy-MM-dd HH-mm-ss'
$commitDirectory = Join-Path $repoRoot 'commit'
$documentName = "$timestamp.md"
$documentPath = Join-Path $commitDirectory $documentName

New-Item -ItemType Directory -Path $commitDirectory -Force | Out-Null
if (Test-Path -LiteralPath $documentPath) {
    throw "Push document already exists: $documentPath"
}

$commitText = ($commits -join [Environment]::NewLine)
$fileText = if ($files.Count -gt 0) {
    ($files | ForEach-Object {
        if ($_ -match '^\s*([A-Z])\s+(.+)$') {
            "- ``$($Matches[1])`` ``$($Matches[2])``"
        }
        else {
            "- ``$_``"
        }
    }) -join [Environment]::NewLine
}
else {
    '- None'
}

$content = @"
# Push Summary

- Created at: $timestamp
- Remote: $Remote
- Branch: $Branch

## Commits

$commitText

## Changed Files

$fileText

## Change Summary

$Summary

## Verification

$Verification
"@

# UTF-8 with BOM so Windows editors display Chinese correctly.
[System.IO.File]::WriteAllText(
    $documentPath,
    $content + [Environment]::NewLine,
    $utf8Bom
)

$relativePath = "commit/$documentName"
Invoke-Git -Arguments @('add', '--', $relativePath) | Out-Null
Invoke-Git -Arguments @('commit', '-m', "docs: add push summary $timestamp") | Out-Null

Write-Host "Created and committed push document: $relativePath"
Invoke-Git -Arguments @('push', $Remote, "HEAD:$Branch") | Out-Null
Write-Host "Pushed to $Remote/$Branch"
