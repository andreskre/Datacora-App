$ErrorActionPreference = "Stop"

$backendRoot = Split-Path -Parent $PSScriptRoot
$nodePath = Join-Path (Split-Path -Parent (Split-Path -Parent $backendRoot)) "tools\node-v24.18.0-win-x64\node.exe"

$env:NODE_OPTIONS = "--use-system-ca"
Set-Location $backendRoot
& $nodePath "src/server.js"
