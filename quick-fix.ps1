# Quick Fix Script for "Cannot find module" Error

Write-Host "=== Quick Fix: Module Loading Issue ===" -ForegroundColor Cyan
Write-Host ""

Write-Host "This script will fix the 'Cannot find module' error by:" -ForegroundColor Yellow
Write-Host "1. Disabling asar packaging (asar: false)" -ForegroundColor White
Write-Host "2. Ensuring .env file is included" -ForegroundColor White
Write-Host "3. Rebuilding the Electron app" -ForegroundColor White
Write-Host ""

# Check if we're in the correct directory
if (-not (Test-Path "electron\package.json")) {
    Write-Host "Error: Please run this script from the project root directory" -ForegroundColor Red
    exit 1
}

# Step 1: Verify electron/package.json has asar: false
Write-Host "[1/4] Verifying Electron configuration..." -ForegroundColor Cyan
$packageJson = Get-Content "electron\package.json" -Raw | ConvertFrom-Json
if ($packageJson.build.asar -eq $false) {
    Write-Host "  ✓ asar is disabled (correct)" -ForegroundColor Green
} else {
    Write-Host "  ✗ asar configuration issue detected!" -ForegroundColor Red
    Write-Host "  Please ensure 'asar: false' is set in electron/package.json" -ForegroundColor Yellow
    exit 1
}

# Step 2: Check if .env exists
Write-Host "[2/4] Checking backend .env file..." -ForegroundColor Cyan
if (Test-Path "backend\.env") {
    Write-Host "  ✓ .env file found" -ForegroundColor Green
} else {
    Write-Host "  ! .env file not found, creating from example..." -ForegroundColor Yellow
    if (Test-Path "backend\.env.example") {
        Copy-Item "backend\.env.example" "backend\.env"
        Write-Host "  ✓ .env file created" -ForegroundColor Green
    } else {
        Write-Host "  ✗ .env.example not found!" -ForegroundColor Red
        exit 1
    }
}

# Step 3: Clean Electron build
Write-Host "[3/4] Cleaning Electron build..." -ForegroundColor Cyan
Set-Location electron
if (Test-Path "dist") {
    Remove-Item -Recurse -Force dist
    Write-Host "  ✓ Cleaned electron\dist" -ForegroundColor Green
}

# Step 4: Rebuild Electron
Write-Host "[4/4] Rebuilding Electron app..." -ForegroundColor Cyan
Write-Host ""
Write-Host "This may take a few minutes..." -ForegroundColor Yellow
pnpm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ✗ Failed to install dependencies" -ForegroundColor Red
    Set-Location ..
    exit 1
}

pnpm build:win
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ✗ Failed to build Electron app" -ForegroundColor Red
    Set-Location ..
    exit 1
}

Set-Location ..

Write-Host ""
Write-Host "=== Fix Complete! ===" -ForegroundColor Green
Write-Host ""
Write-Host "The installer is ready at: electron\dist\" -ForegroundColor Yellow
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Uninstall the old version (if installed)" -ForegroundColor White
Write-Host "2. Install the new version from electron\dist\" -ForegroundColor White
Write-Host "3. Before running, edit the .env file in the installation directory:" -ForegroundColor White
Write-Host "   %LocalAppData%\Programs\to-docx-desktop\resources\backend\.env" -ForegroundColor Gray
Write-Host "4. Add your DashScope API Key to the .env file" -ForegroundColor White
Write-Host ""

