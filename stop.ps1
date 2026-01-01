# Stop all To-Docx related processes

Write-Host "=== Stopping To-Docx Processes ===" -ForegroundColor Yellow
Write-Host ""

# Stop Electron
Write-Host "Stopping Electron..." -ForegroundColor Cyan
$electronProcesses = Get-Process -Name "electron" -ErrorAction SilentlyContinue
if ($electronProcesses) {
    $electronProcesses | Stop-Process -Force
    Write-Host "  ✓ Stopped $($electronProcesses.Count) Electron process(es)" -ForegroundColor Green
} else {
    Write-Host "  - No Electron processes running" -ForegroundColor Gray
}

# Stop Python backend
Write-Host "Stopping Python backend..." -ForegroundColor Cyan
$pythonProcesses = Get-Process -Name "python" -ErrorAction SilentlyContinue | Where-Object {
    $_.CommandLine -like "*to-docx*" -or $_.CommandLine -like "*main.py*"
}
if ($pythonProcesses) {
    $pythonProcesses | Stop-Process -Force
    Write-Host "  ✓ Stopped $($pythonProcesses.Count) Python process(es)" -ForegroundColor Green
} else {
    Write-Host "  - No Python backend processes running" -ForegroundColor Gray
}

# Check port 8765
Write-Host ""
Write-Host "Checking port 8765..." -ForegroundColor Cyan
$portUsage = netstat -ano | findstr :8765
if ($portUsage) {
    Write-Host "Port 8765 is still in use:" -ForegroundColor Yellow
    Write-Host $portUsage -ForegroundColor Gray
    
    # Extract PIDs and kill them
    $portUsage | ForEach-Object {
        if ($_ -match '\s+(\d+)\s*$') {
            $pid = $matches[1]
            if ($pid -ne "0") {
                try {
                    Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
                    Write-Host "  ✓ Killed process $pid" -ForegroundColor Green
                } catch {
                    Write-Host "  - Process $pid already closed" -ForegroundColor Gray
                }
            }
        }
    }
} else {
    Write-Host "  ✓ Port 8765 is free" -ForegroundColor Green
}

Write-Host ""
Write-Host "=== All processes stopped ===" -ForegroundColor Green

