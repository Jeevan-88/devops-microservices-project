#!/bin/bash

echo "🚀 Starting LeadGen Pro Platform..."
echo "=================================="

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker is not running. Please start Docker Desktop and try again."
    exit 1
fi

echo "✅ Docker is running"

# Check if docker-compose exists
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Error: docker-compose not found. Please install Docker Compose."
    exit 1
fi

echo "✅ Docker Compose found"

# Build and start all services
echo ""
echo "📦 Building Docker images (this may take a few minutes)..."
docker-compose build

echo ""
echo "🚀 Starting all services..."
docker-compose up -d

# Wait for services to be healthy
echo ""
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check service health
echo ""
echo "🏥 Checking service health..."

check_service() {
    SERVICE_NAME=$1
    PORT=$2
    
    if curl -s http://localhost:$PORT/health > /dev/null 2>&1; then
        echo "✅ $SERVICE_NAME is running (port $PORT)"
        return 0
    else
        echo "⚠️  $SERVICE_NAME may need more time to start (port $PORT)"
        return 1
    fi
}

check_service "Auth Service" 3001
check_service "Lead Service" 3002
check_service "Email Service" 3003
check_service "Blog Service" 3005

# Check if Nginx is running
if curl -s http://localhost > /dev/null 2>&1; then
    echo "✅ Nginx API Gateway is running (port 80)"
else
    echo "⚠️  Nginx may need more time to start"
fi

echo ""
echo "=================================="
echo "🎉 Platform is starting up!"
echo ""
echo "📍 Access the applications:"
echo "   Portfolio:  http://localhost"
echo "   Blog:       http://localhost/blog"
echo "   Dashboard:  http://localhost/dashboard"
echo ""
echo "📡 API Services:"
echo "   Auth API:   http://localhost/api/auth"
echo "   Lead API:   http://localhost/api/leads"
echo "   Email API:  http://localhost/api/email"
echo "   Blog API:   http://localhost/api/blog"
echo ""
echo "📊 View logs:"
echo "   docker-compose logs -f [service-name]"
echo ""
echo "🛑 Stop all services:"
echo "   docker-compose down"
echo ""
echo "=================================="
