param([int]$Port = 55437)

$ErrorActionPreference = 'Stop'
$apiRoot = Split-Path -Parent $PSScriptRoot
$runtimeRoot = Join-Path $apiRoot '.local/postgres17'
$binaryRoot = Join-Path $runtimeRoot 'pgsql/bin'
$dataPath = Join-Path $runtimeRoot 'data'
$keyPath = Join-Path $runtimeRoot 'password.dpapi'
$pgCtl = Join-Path $binaryRoot 'pg_ctl.exe'
if (-not (Test-Path -LiteralPath $pgCtl)) { throw 'Extract PostgreSQL 17 Windows binaries into .local/postgres17/pgsql first.' }
if ($Port -lt 1024 -or $Port -gt 65535) { throw 'Choose an unprivileged local test port.' }

if (-not (Test-Path -LiteralPath (Join-Path $dataPath 'PG_VERSION'))) {
  if (Test-Path -LiteralPath $dataPath) { throw 'Existing incomplete data directory: inspect it before retrying.' }
  $randomPassword = [Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
  $securePassword = ConvertTo-SecureString $randomPassword -AsPlainText -Force
  $securePassword | ConvertFrom-SecureString | Set-Content -LiteralPath $keyPath
  $startInfo = [Diagnostics.ProcessStartInfo]::new()
  $startInfo.FileName = Join-Path $binaryRoot 'initdb.exe'
  $startInfo.UseShellExecute = $false
  $startInfo.CreateNoWindow = $true
  $startInfo.RedirectStandardOutput = $true
  $startInfo.RedirectStandardError = $true
  $pipeName = 'mercado-initdb-' + [Guid]::NewGuid().ToString('N')
  $pipe = [IO.Pipes.NamedPipeServerStream]::new($pipeName, [IO.Pipes.PipeDirection]::Out, 1, [IO.Pipes.PipeTransmissionMode]::Byte, [IO.Pipes.PipeOptions]::Asynchronous)
  foreach ($argument in @('-D', $dataPath, '-U', 'mercado_test', '-A', 'scram-sha-256', "--pwfile=\\.\pipe\$pipeName", '--encoding=UTF8', '--locale=C')) {
    $startInfo.ArgumentList.Add($argument)
  }
  $process = [Diagnostics.Process]::Start($startInfo)
  $stdout = $process.StandardOutput.ReadToEndAsync()
  $stderr = $process.StandardError.ReadToEndAsync()
  try {
    if (-not $pipe.WaitForConnectionAsync().Wait(15000)) {
      if (-not $process.HasExited) { $process.Kill($true) }
      throw 'initdb did not connect to the in-memory password pipe.'
    }
    $writer = [IO.StreamWriter]::new($pipe, [Text.UTF8Encoding]::new($false))
    $writer.WriteLine($randomPassword)
    $writer.Flush()
    $writer.Dispose()
  } finally { $pipe.Dispose() }
  if (-not $process.WaitForExit(60000)) { $process.Kill($true); throw 'initdb timed out.' }
  Write-Output $stdout.GetAwaiter().GetResult()
  Write-Output $stderr.GetAwaiter().GetResult()
  if ($process.ExitCode -ne 0) { throw 'initdb failed.' }
} else {
  if ((Get-Content -LiteralPath (Join-Path $dataPath 'PG_VERSION') -Raw).Trim() -ne '17') { throw 'Expected PostgreSQL 17 cluster.' }
  $securePassword = (Get-Content -LiteralPath $keyPath -Raw).Trim() | ConvertTo-SecureString
  $randomPassword = [Net.NetworkCredential]::new('', $securePassword).Password
}

$databaseName = 'mercado_test_' + [Guid]::NewGuid().ToString('N')
$variables = @{
  RUN_DATABASE_E2E = 'true'; NODE_ENV = 'test'; DATABASE_NAME = $databaseName;
  DATABASE_HOST = '127.0.0.1'; DATABASE_PORT = [string]$Port;
  DATABASE_USER = 'mercado_test'; DATABASE_PASSWORD = $randomPassword;
  DATABASE_SSL = 'false'; SESSION_TTL_MINUTES = '60'; EVIDENCE_RETENTION_YEARS = '5';
  PGPASSWORD = $randomPassword
}
$original = @{}
$started = $false
Push-Location $apiRoot
try {
  foreach ($name in $variables.Keys) {
    $original[$name] = [Environment]::GetEnvironmentVariable($name, 'Process')
    [Environment]::SetEnvironmentVariable($name, $variables[$name], 'Process')
  }
  & $pgCtl -D $dataPath -l (Join-Path $runtimeRoot 'postgres.log') -o "-h 127.0.0.1 -p $Port" -w start
  if ($LASTEXITCODE -ne 0) { throw 'Could not start the isolated test server.' }
  $started = $true
  & (Join-Path $binaryRoot 'createdb.exe') -h 127.0.0.1 -p $Port -U mercado_test $databaseName
  if ($LASTEXITCODE -ne 0) { throw 'Could not create test database.' }
  Write-Output "Testing against PostgreSQL 17: $databaseName on loopback port $Port"
  npm run test:e2e
  if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL integration tests failed; evidence retained in the test database.' }
  $backupOutput = & (Join-Path $PSScriptRoot 'backup-postgres.ps1') -PostgresBinPath $binaryRoot
  $archivePath = [string]($backupOutput | Select-Object -Last 1)
  if (-not (Test-Path -LiteralPath $archivePath -PathType Leaf)) { throw 'Backup verification did not produce an archive.' }
  $restoreDatabase = 'mercado_restore_test_' + [Guid]::NewGuid().ToString('N')
  try {
    & (Join-Path $PSScriptRoot 'restore-postgres.ps1') -ArchivePath $archivePath -TargetDatabase $restoreDatabase -ConfirmTargetDatabase $restoreDatabase -CreateDatabase -PostgresBinPath $binaryRoot
  } catch {
    Write-Output $_.ScriptStackTrace
    throw
  }
  if ($LASTEXITCODE -ne 0) { throw 'Backup restore verification failed.' }
  $restoredMigrations = & (Join-Path $binaryRoot 'psql.exe') -h 127.0.0.1 -p $Port -U mercado_test -d $restoreDatabase -tA -c 'SELECT count(*) FROM migrations'
  if ($LASTEXITCODE -ne 0 -or [int]$restoredMigrations -ne 19) { throw 'Restored database does not contain all migrations.' }
  $restoredAuditEvents = & (Join-Path $binaryRoot 'psql.exe') -h 127.0.0.1 -p $Port -U mercado_test -d $restoreDatabase -tA -c 'SELECT count(*) FROM audit_events'
  if ($LASTEXITCODE -ne 0 -or [int]$restoredAuditEvents -lt 1) { throw 'Restored database does not contain the expected audit evidence.' }
  Write-Output "Backup restored and verified in $restoreDatabase from $archivePath"
} finally {
  if ($started) {
    & $pgCtl -D $dataPath -m fast -w stop
    if ($LASTEXITCODE -ne 0) { Write-Warning 'The test server did not confirm shutdown; inspect pg_ctl status.' }
  }
  foreach ($name in $original.Keys) { [Environment]::SetEnvironmentVariable($name, $original[$name], 'Process') }
  Pop-Location
}
