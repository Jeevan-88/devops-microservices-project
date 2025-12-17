# LeadGen Pro Platform - Startup Script
# Run this script to start all services

Write-Host "🚀 Starting LeadGen Pro Platform..." -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan

# Check if Docker is running
try {
    docker info | Out-Null
    Write-Host "✅ Docker is running" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: Docker is not running. Please start Docker Desktop and try again." -ForegroundColor Red
    exit 1
}

# Build and start all services
Write-Host ""
Write-Host "📦 Building Docker images (this may take a few minutes)..." -ForegroundColor Yellow
docker-compose build

Write-Host ""
Write-Host "🚀 Starting all services..." -ForegroundColor Yellow
docker-compose up -d

# Wait for services
Write-Host ""
Write-Host "⏳ Waiting for services to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

Write-Host ""
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "🎉 Platform is starting up!" -ForegroundColor Green
Write-Host ""
Write-Host "📍 Access the applications:" -ForegroundColor Cyan
Write-Host "   Portfolio:  http://localhost" -ForegroundColor White
Write-Host "   Blog:       http://localhost/blog" -ForegroundColor White
Write-Host "   Dashboard:  http://localhost/dashboard" -ForegroundColor White
Write-Host ""
Write-Host "📡 API Services:" -ForegroundColor Cyan
Write-Host "   Auth API:   http://localhost/api/auth" -ForegroundColor White
Write-Host "   Lead API:   http://localhost/api/leads" -ForegroundColor White
Write-Host "   Email API:  http://localhost/api/email" -ForegroundColor White
Write-Host "   Blog API:   http://localhost/api/blog" -ForegroundColor White
Write-Host ""
Write-Host "📊 View logs:" -ForegroundColor Cyan
Write-Host "   docker-compose logs -f [service-name]" -ForegroundColor White
Write-Host ""
Write-Host "🛑 Stop all services:" -ForegroundColor Cyan
Write-Host "   docker-compose down" -ForegroundColor White
Write-Host ""
Write-Host "==================================" -ForegroundColor Cyan

# Open browser
Write-Host ""
$response = Read-Host "Would you like to open the portfolio in your browser? (Y/N)"
if ($response -eq 'Y' -or $response -eq 'y') {
    Start-Process "http://localhost"
}
