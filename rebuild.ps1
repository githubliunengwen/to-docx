# Clean and Rebuild Script - Fixes module loading issues

Write-Host "=== Cleaning Old Build Files ===" -ForegroundColor Yellow
Write-Host ""

# Clean Electron build
Write-Host "Cleaning Electron build..." -ForegroundColor Cyan
if (Test-Path "electron\dist") {
    Remove-Item -Recurse -Force "electron\dist"
    Write-Host "  - Removed electron\dist" -ForegroundColor Green
}
if (Test-Path "electron\node_modules") {
    Remove-Item -Recurse -Force "electron\node_modules"
    Write-Host "  - Removed electron\node_modules" -ForegroundColor Green
}

# Clean Frontend build
Write-Host "Cleaning Frontend build..." -ForegroundColor Cyan
if (Test-Path "frontend\dist") {
    Remove-Item -Recurse -Force "frontend\dist"
    Write-Host "  - Removed frontend\dist" -ForegroundColor Green
}

# Clean Backend build
Write-Host "Cleaning Backend build..." -ForegroundColor Cyan
if (Test-Path "backend\dist") {
    Remove-Item -Recurse -Force "backend\dist"
    Write-Host "  - Removed backend\dist" -ForegroundColor Green
}
if (Test-Path "backend\build") {
    Remove-Item -Recurse -Force "backend\build"
    Write-Host "  - Removed backend\build" -ForegroundColor Green
}

Write-Host ""
Write-Host "=== Cleanup Complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "Now running full rebuild..." -ForegroundColor Yellow
Write-Host ""

# Run the build script
& ".\build.ps1"

