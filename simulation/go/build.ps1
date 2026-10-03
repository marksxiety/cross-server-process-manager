# Builds the Go simulation into the binary name the seeded Go template expects.
$ErrorActionPreference = 'Stop'

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
Push-Location $here
try {
    go build -o my-go-app.exe .
    Write-Host 'Built my-go-app.exe'
} finally {
    Pop-Location
}
