# To-Docx Build Script
# This script builds the complete application package

Write-Host "=== To-Docx Build Script ===" -ForegroundColor Green
Write-Host ""

# Check if we're in the correct directory
if (-not (Test-Path "electron\package.json")) {
    Write-Host "Error: Please run this script from the project root directory" -ForegroundColor Red
    exit 1
}

# Step 1: Build Frontend
Write-Host "[1/3] Building Frontend..." -ForegroundColor Cyan
Set-Location frontend
if (Test-Path "dist") {
    Remove-Item -Recurse -Force dist
}
pnpm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Frontend dependencies installation failed" -ForegroundColor Red
    exit 1
}
pnpm build:h5
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Frontend build failed" -ForegroundColor Red
    exit 1
}
Set-Location ..
Write-Host "Frontend build completed!" -ForegroundColor Green
Write-Host ""

# Step 2: Build Backend
Write-Host "[2/3] Building Backend..." -ForegroundColor Cyan
Set-Location backend
if (Test-Path "dist") {
    Remove-Item -Recurse -Force dist
}
if (Test-Path "build") {
    Remove-Item -Recurse -Force build
}
# Activate virtual environment and build
& "venv\Scripts\python.exe" -m PyInstaller to-docx-backend.spec --clean
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Backend build failed" -ForegroundColor Red
    exit 1
}
Set-Location ..
Write-Host "Backend build completed!" -ForegroundColor Green
Write-Host ""

# Step 3: Build Electron
Write-Host "[3/3] Building Electron App..." -ForegroundColor Cyan
Set-Location electron

# Kill any running Electron processes
Write-Host "Checking for running Electron processes..." -ForegroundColor Yellow
$electronProcesses = Get-Process -Name "electron" -ErrorAction SilentlyContinue
if ($electronProcesses) {
    Write-Host "Stopping running Electron processes..." -ForegroundColor Yellow
    $electronProcesses | Stop-Process -Force
    Start-Sleep -Seconds 2
}

# Clean old build files
if (Test-Path "dist") {
    Write-Host "Cleaning old Electron build..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force dist -ErrorAction SilentlyContinue
}

# Install dependencies using npm
Write-Host "Installing Electron dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Electron dependencies installation failed" -ForegroundColor Red
    Set-Location ..
    exit 1
}

# Build for Windows
Write-Host "Building Electron installer..." -ForegroundColor Yellow
npm run build:win
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Electron build failed" -ForegroundColor Red
    Set-Location ..
    exit 1
}
Set-Location ..
Write-Host "Electron build completed!" -ForegroundColor Green
Write-Host ""

# Show result
Write-Host "=== Build Complete ===" -ForegroundColor Green
Write-Host "Installation package location: electron\dist\" -ForegroundColor Yellow
Write-Host ""
Write-Host "You can now install the application from the generated installer." -ForegroundColor Cyan
