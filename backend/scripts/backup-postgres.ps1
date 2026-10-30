param(
  [string]$OutputDirectory,
  [string]$PostgresBinPath
)

$ErrorActionPreference = 'Stop'
$apiRoot = Split-Path -Parent $PSScriptRoot
if (-not $OutputDirectory) { $OutputDirectory = Join-Path $apiRoot '.local/backups' }
if (-not $PostgresBinPath) { $PostgresBinPath = Join-Path $apiRoot '.local/postgres17/pgsql/bin' }

$databaseName = [Environment]::GetEnvironmentVariable('DATABASE_NAME', 'Process')
$databaseHost = [Environment]::GetEnvironmentVariable('DATABASE_HOST', 'Process')
$databasePort = [Environment]::GetEnvironmentVariable('DATABASE_PORT', 'Process')
$databaseUser = [Environment]::GetEnvironmentVariable('DATABASE_USER', 'Process')
$databasePassword = [Environment]::GetEnvironmentVariable('DATABASE_PASSWORD', 'Process')

foreach ($required in @{
    DATABASE_HOST = $databaseHost
    DATABASE_NAME = $databaseName
    DATABASE_PASSWORD = $databasePassword
    DATABASE_PORT = $databasePort
    DATABASE_USER = $databaseUser
  }.GetEnumerator()) {
  if ([string]::IsNullOrWhiteSpace([string]$required.Value)) {
    throw "$($required.Key) is required."
  }
}
$parsedPort = 0
if (-not [int]::TryParse($databasePort, [ref]$parsedPort)) { throw 'DATABASE_PORT must be an integer.' }

$pgDump = Join-Path $PostgresBinPath 'pg_dump.exe'
if (-not (Test-Path -LiteralPath $pgDump)) {
  $command = Get-Command pg_dump -ErrorAction SilentlyContinue
  if (-not $command) { throw 'pg_dump was not found. Provide -PostgresBinPath.' }
  $pgDump = $command.Source
}

$resolvedOutput = [IO.Path]::GetFullPath($OutputDirectory)
[IO.Directory]::CreateDirectory($resolvedOutput) | Out-Null
$safeDatabaseName = $databaseName -replace '[^A-Za-z0-9_-]', '_'
$timestamp = [DateTime]::UtcNow.ToString('yyyyMMddTHHmmssfffZ')
$archivePath = Join-Path $resolvedOutput "$safeDatabaseName-$timestamp.dump"
$metadataPath = [IO.Path]::ChangeExtension($archivePath, '.json')
$originalPgPassword = [Environment]::GetEnvironmentVariable('PGPASSWORD', 'Process')

try {
  [Environment]::SetEnvironmentVariable('PGPASSWORD', $databasePassword, 'Process')
  & $pgDump '--format=custom' '--no-owner' '--no-privileges' '--no-password' '--host' $databaseHost '--port' $databasePort '--username' $databaseUser '--file' $archivePath $databaseName
  if ($LASTEXITCODE -ne 0) { throw "pg_dump failed with exit code $LASTEXITCODE." }
}
finally {
  [Environment]::SetEnvironmentVariable('PGPASSWORD', $originalPgPassword, 'Process')
}

$archive = Get-Item -LiteralPath $archivePath
$hash = (Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash
$version = (& $pgDump '--version') -join ' '
[ordered]@{
  archiveFile = $archive.Name
  createdAtUtc = [DateTime]::UtcNow.ToString('o')
  databaseName = $databaseName
  format = 'postgresql-custom'
  host = $databaseHost
  pgDumpVersion = $version
  port = $parsedPort
  sha256 = $hash
  sizeBytes = $archive.Length
} | ConvertTo-Json | Set-Content -LiteralPath $metadataPath -Encoding utf8

Write-Output $archive.FullName
