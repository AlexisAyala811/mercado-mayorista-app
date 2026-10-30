param(
  [Parameter(Mandatory = $true)]
  [string]$ArchivePath,
  [Parameter(Mandatory = $true)]
  [string]$TargetDatabase,
  [Parameter(Mandatory = $true)]
  [string]$ConfirmTargetDatabase,
  [switch]$CreateDatabase,
  [switch]$AllowProductionTarget,
  [string]$PostgresBinPath
)

$ErrorActionPreference = 'Stop'
$apiRoot = Split-Path -Parent $PSScriptRoot
if (-not $PostgresBinPath) { $PostgresBinPath = Join-Path $apiRoot '.local/postgres17/pgsql/bin' }
if ($TargetDatabase -cne $ConfirmTargetDatabase) { throw 'ConfirmTargetDatabase must exactly match TargetDatabase.' }
if ($TargetDatabase -notmatch '^[A-Za-z][A-Za-z0-9_]{0,62}$') { throw 'TargetDatabase must be a safe PostgreSQL identifier.' }
if (-not $AllowProductionTarget -and $TargetDatabase -notmatch '(?i)(test|restore)') {
  throw 'The target name must contain test or restore unless -AllowProductionTarget is explicitly supplied.'
}

$resolvedArchive = [IO.Path]::GetFullPath($ArchivePath)
if (-not (Test-Path -LiteralPath $resolvedArchive -PathType Leaf)) { throw 'Backup archive not found.' }
$databaseHost = [Environment]::GetEnvironmentVariable('DATABASE_HOST', 'Process')
$databasePort = [Environment]::GetEnvironmentVariable('DATABASE_PORT', 'Process')
$databaseUser = [Environment]::GetEnvironmentVariable('DATABASE_USER', 'Process')
$databasePassword = [Environment]::GetEnvironmentVariable('DATABASE_PASSWORD', 'Process')
foreach ($required in @{
    DATABASE_HOST = $databaseHost
    DATABASE_PASSWORD = $databasePassword
    DATABASE_PORT = $databasePort
    DATABASE_USER = $databaseUser
  }.GetEnumerator()) {
  if ([string]::IsNullOrWhiteSpace([string]$required.Value)) { throw "$($required.Key) is required." }
}

$executables = @{}
foreach ($name in @('createdb', 'pg_restore', 'psql')) {
  $candidate = Join-Path $PostgresBinPath "$name.exe"
  if (-not (Test-Path -LiteralPath $candidate)) {
    $command = Get-Command $name -ErrorAction SilentlyContinue
    if (-not $command) { throw "$name was not found. Provide -PostgresBinPath." }
    $candidate = $command.Source
  }
  $executables[$name] = $candidate
}

$metadataPath = [IO.Path]::ChangeExtension($resolvedArchive, '.json')
if (Test-Path -LiteralPath $metadataPath) {
  $metadata = Get-Content -LiteralPath $metadataPath -Raw | ConvertFrom-Json
  $observedHash = (Get-FileHash -LiteralPath $resolvedArchive -Algorithm SHA256).Hash
  if ($metadata.sha256 -cne $observedHash) { throw 'Backup SHA-256 does not match its metadata.' }
}

$originalPgPassword = [Environment]::GetEnvironmentVariable('PGPASSWORD', 'Process')
try {
  [Environment]::SetEnvironmentVariable('PGPASSWORD', $databasePassword, 'Process')
  $connection = @('--host', $databaseHost, '--port', $databasePort, '--username', $databaseUser, '--no-password')
  $databaseExists = [string](& ($executables['psql']) @connection '--dbname' 'postgres' '--tuples-only' '--no-align' '--command' "SELECT 1 FROM pg_database WHERE datname = '$TargetDatabase'")
  $databaseExists = "$databaseExists".Trim()
  if ($LASTEXITCODE -ne 0) { throw 'Could not inspect the PostgreSQL server.' }
  if ($databaseExists -ne '1') {
    if (-not $CreateDatabase) { throw 'Target database does not exist. Use -CreateDatabase to create an empty target.' }
    & ($executables['createdb']) @connection $TargetDatabase
    if ($LASTEXITCODE -ne 0) { throw 'Could not create the target database.' }
  }
  $tableCount = [string](& ($executables['psql']) @connection '--dbname' $TargetDatabase '--tuples-only' '--no-align' '--command' "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'")
  $tableCount = "$tableCount".Trim()
  if ($LASTEXITCODE -ne 0) { throw 'Could not inspect the target database.' }
  if ([int]$tableCount -ne 0) { throw 'Restore target is not empty; restoration was refused.' }

  & ($executables['pg_restore']) @connection '--exit-on-error' '--single-transaction' '--no-owner' '--no-privileges' '--dbname' $TargetDatabase $resolvedArchive
  if ($LASTEXITCODE -ne 0) { throw "pg_restore failed with exit code $LASTEXITCODE." }
}
finally {
  [Environment]::SetEnvironmentVariable('PGPASSWORD', $originalPgPassword, 'Process')
}

Write-Output "Restored $resolvedArchive into $TargetDatabase."
