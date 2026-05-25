# =============================================
# Libreria App - Inicio rapido con Docker
# =============================================
param(
    [switch]$NoSeed,
    [switch]$Rebuild
)

Write-Host "=== Libreria App - Inicio con Docker ===" -ForegroundColor Cyan

# ---- 1. Validar Docker ----
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Error "Docker no esta instalado. Descargalo de https://docs.docker.com/desktop/"
    exit 1
}

try {
    docker info *>$null
} catch {
    Write-Error "Docker Desktop no esta corriendo. Inicialo desde el menu inicio."
    exit 1
}

# ---- 2. Crear .env en frontend si no existe ----
$frontendEnv = ".\frontend\.env"
if (-not (Test-Path $frontendEnv)) {
    Write-Host "[1/4] Creando frontend/.env..." -ForegroundColor Yellow
    Set-Content -Path $frontendEnv -Value @"
VITE_SUPABASE_URL=http://localhost:8000
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
"@
} else {
    Write-Host "[1/4] frontend/.env ya existe" -ForegroundColor Green
}

# ---- 3. Construir frontend ----
Write-Host "[2/4] Construyendo frontend..." -ForegroundColor Yellow
Push-Location .\frontend
npm install *>$null
npm run build
if ($LASTEXITCODE -ne 0) {
    Pop-Location
    Write-Error "Error al construir el frontend"
    exit 1
}
Pop-Location

# ---- 4. Iniciar servicios Docker ----
$buildFlag = if ($Rebuild) { "--build" } else { "" }
Write-Host "[3/4] Iniciando servicios Docker..." -ForegroundColor Yellow
docker compose up -d $buildFlag
if ($LASTEXITCODE -ne 0) {
    Write-Error "Error al iniciar Docker. Revisa que Docker Desktop este funcionando."
    exit 1
}

# ---- 5. Esperar a que la DB este lista ----
Write-Host "[4/6] Esperando a que la base de datos este lista..." -ForegroundColor Yellow
$ready = $false
for ($i = 0; $i -lt 30; $i++) {
    $result = docker exec pc2-db pg_isready -U postgres 2>$null
    if ($result -match "accepting connections") {
        $ready = $true
        break
    }
    Start-Sleep -Seconds 2
}

if (-not $ready) {
    Write-Warning "La base de datos no respondio a tiempo. Revisa los logs con: docker compose logs db"
}

# ---- 6. Aplicar schema (despues de que Supabase init termino) ----
if ($ready) {
    Write-Host "[5/6] Aplicando schema de la libreria..." -ForegroundColor Yellow
    Get-Content .\supabase\migrations\001_schema_clean.sql | docker exec -i pc2-db psql -U postgres -d postgres 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "El schema ya estaba aplicado (errores ignorados)"
    }
}

# ---- 7. Seed data ----
if (-not $NoSeed -and $ready) {
    Write-Host "[6/6] Sembrando datos de prueba..." -ForegroundColor Yellow
    Get-Content .\supabase\seed.sql | docker exec -i pc2-db psql -U postgres -d postgres 2>$null
}

# ---- Resumen ----
Write-Host " " -NoNewline
Write-Host "=== Listo ===" -ForegroundColor Cyan
Write-Host "Frontend:        http://localhost:3000" -ForegroundColor Green
Write-Host "Supabase API:    http://localhost:8000" -ForegroundColor Green
Write-Host "Supabase Studio: http://localhost:54323" -ForegroundColor Green
Write-Host "Email testing:   http://localhost:54324" -ForegroundColor Green
Write-Host " " -NoNewline
Write-Host "Para detener: docker compose down" -ForegroundColor Yellow
