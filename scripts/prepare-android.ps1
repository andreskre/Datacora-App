$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$www = Join-Path $root "www"

if (Test-Path $www) {
  Remove-Item -LiteralPath $www -Recurse -Force
}

New-Item -ItemType Directory -Force -Path $www | Out-Null

Copy-Item -LiteralPath (Join-Path $root "index.html") -Destination $www
Copy-Item -LiteralPath (Join-Path $root "manifest.webmanifest") -Destination $www
Copy-Item -LiteralPath (Join-Path $root "src") -Destination (Join-Path $www "src") -Recurse
if (Test-Path (Join-Path $root "vendor")) {
  Copy-Item -LiteralPath (Join-Path $root "vendor") -Destination (Join-Path $www "vendor") -Recurse
}
