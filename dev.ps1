# To-Docx Development Startup Script

Write-Host "=== Starting To-Docx Development Environment ===" -ForegroundColor Green
Write-Host ""

# Check if we're in the correct directory
if (-not (Test-Path "electron\package.json")) {
    Write-Host "Error: Please run this script from the project root directory" -ForegroundColor Red
    exit 1
}

# Stop any running processes first
Write-Host "Stopping any running processes..." -ForegroundColor Yellow
Get-Process -Name "electron" -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 1

# Check if port 8765 is in use
$portUsage = netstat -ano | findstr :8765
if ($portUsage) {
    Write-Host "Port 8765 is in use. Cleaning up..." -ForegroundColor Yellow
    $portUsage | ForEach-Object {
        if ($_ -match '\s+(\d+)\s*$') {
            $pid = $matches[1]
            if ($pid -ne "0") {
                Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
            }
        }
    }
    Start-Sleep -Seconds 2
}

Write-Host "All clear! Starting services..." -ForegroundColor Green
Write-Host ""

# Function to start a process in a new window
function Start-ServiceInNewWindow {
    param (
        [string]$Title,
        [string]$Command,
        [string]$WorkingDirectory
    )
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$WorkingDirectory'; Write-Host '=== $Title ===' -ForegroundColor Cyan; $Command"
}

Write-Host "Starting services in separate windows..." -ForegroundColor Cyan
Write-Host ""
Write-Host "NOTE: Backend will be automatically started by Electron" -ForegroundColor Yellow
Write-Host ""

# Start Frontend
Write-Host "[1/2] Starting Frontend Service..." -ForegroundColor Yellow
Start-ServiceInNewWindow -Title "Frontend Service" -Command "npm run dev:h5" -WorkingDirectory "$PWD\frontend"
Start-Sleep -Seconds 5

# Start Electron (it will start backend automatically)
Write-Host "[2/2] Starting Electron App (will start backend)..." -ForegroundColor Yellow
Start-ServiceInNewWindow -Title "Electron App" -Command "npm run dev" -WorkingDirectory "$PWD\electron"

Write-Host ""
Write-Host "=== All Services Started ===" -ForegroundColor Green
Write-Host "Backend:  http://localhost:8765 (started by Electron)" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:20000" -ForegroundColor Cyan
Write-Host "Electron: Development Window" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press any key to close this window (services will continue running)..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
