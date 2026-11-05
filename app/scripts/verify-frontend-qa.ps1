# Local QA only. This script does not start services or modify commercial data.
[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$taskProjectRoot = Split-Path -Parent $PSScriptRoot
$taskPreviousApiUrl = [Environment]::GetEnvironmentVariable('EXPO_PUBLIC_API_URL', 'Process')
$taskStartedAt = [DateTimeOffset]::UtcNow

Push-Location -LiteralPath $taskProjectRoot
try {
    Write-Host '1/3: TypeScript, lint y todas las pruebas del frontend'
    & npm.cmd run check
    if ($LASTEXITCODE -ne 0) {
        throw 'La verificación del código falló. No se exportó el frontend.'
    }

    Write-Host '2/3: Exportación web para la API QA local'
    $env:EXPO_PUBLIC_API_URL = 'http://localhost:3000/api/v1'
    & npm.cmd run export:web
    if ($LASTEXITCODE -ne 0) {
        throw 'La exportación falló. El contenido de dist no debe considerarse un build verificado.'
    }

    Write-Host '3/3: Integridad de los recursos PDF locales y exportados'
    & node scripts/verify-pdfjs-assets.mjs
    if ($LASTEXITCODE -ne 0) {
        throw 'La integridad de los recursos PDF falló. El build requiere corrección.'
    }

    [pscustomobject]@{
        StartedAtUtc = $taskStartedAt.ToString('o')
        CompletedAtUtc = [DateTimeOffset]::UtcNow.ToString('o')
        CodeChecks = 'passed'
        WebExport = 'passed'
        PdfAssets = 'passed'
        Scope = 'QA local; pendientes los recorridos reales, Android, accesibilidad y convergencia Figma'
    } | ConvertTo-Json
}
finally {
    [Environment]::SetEnvironmentVariable('EXPO_PUBLIC_API_URL', $taskPreviousApiUrl, 'Process')
    Pop-Location
}
