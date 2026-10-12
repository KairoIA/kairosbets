# Publicar KairosBets en Cloudflare Pages (12-oct-2026).
# Javi: «añade la regla para publicar KairosBets sin preguntar». Este es el ÚNICO camino que tiene permiso fijo en
# ~/.claude/settings.json: compila app/ y publica dist/ + functions/ en el proyecto «kairosbets».
#   main   → https://kairosbets.pages.dev (la de Javi)
#   prueba → https://prueba.kairosbets.pages.dev (almacén de prueba, para probar antes)
# Uso (desde git-bash):
#   powershell -NoProfile -ExecutionPolicy Bypass -File C:/Users/Administrator/Desktop/4_APUESTAS/kairosbets/publicar.ps1 [-Rama prueba]
# Las credenciales salen de las variables de usuario (CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID); nunca van aquí.
param([ValidateSet("main", "prueba")][string]$Rama = "main")
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$env:CLOUDFLARE_API_TOKEN = [Environment]::GetEnvironmentVariable("CLOUDFLARE_API_TOKEN", "User")
$env:CLOUDFLARE_ACCOUNT_ID = [Environment]::GetEnvironmentVariable("CLOUDFLARE_ACCOUNT_ID", "User")
if (-not $env:CLOUDFLARE_API_TOKEN -or -not $env:CLOUDFLARE_ACCOUNT_ID) { throw "Faltan CLOUDFLARE_API_TOKEN o CLOUDFLARE_ACCOUNT_ID en las variables de usuario" }

npm run build
if ($LASTEXITCODE -ne 0) { throw "Falló la compilación" }

# wrangler ya descargado por npx (con npx@latest falla con EBUSY si otra sesión tiene «wrangler pages dev» abierto)
$wrangler = Get-ChildItem "$env:LOCALAPPDATA\npm-cache\_npx\*\node_modules\wrangler\package.json" |
  Sort-Object { [version]((Get-Content $_.FullName -Raw | ConvertFrom-Json).version) } -Descending |
  Select-Object -First 1
if (-not $wrangler) { throw "No encuentro wrangler en la caché de npx: ejecuta una vez «npx wrangler@latest --version»" }
node (Join-Path $wrangler.DirectoryName "bin\wrangler.js") pages deploy dist --project-name kairosbets --branch $Rama --commit-dirty=true
if ($LASTEXITCODE -ne 0) { throw "Falló la publicación" }
