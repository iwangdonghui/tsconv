#!/bin/sh

# TSConv Docker Health Check Script
# This script performs comprehensive health checks for the containerized application

set -e

# Configuration
HEALTH_URL="http://localhost:8080/health"
APP_URL="http://localhost:8080"
TIMEOUT=3
MAX_RETRIES=3

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# Health check function
check_endpoint() {
    local url=$1
    local expected_status=${2:-200}
    local description=$3
    
    log "Checking $description: $url"
    
    response=$(curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT "$url" 2>/dev/null || echo "000")
    
    if [ "$response" = "$expected_status" ]; then
        log "${GREEN}✅ $description: OK (HTTP $response)${NC}"
        return 0
    else
        log "${RED}❌ $description: FAILED (HTTP $response)${NC}"
        return 1
    fi
}

# Check if nginx is running
check_nginx() {
    log "Checking nginx process..."
    if pgrep nginx > /dev/null; then
        log "${GREEN}✅ Nginx process: RUNNING${NC}"
        return 0
    else
        log "${RED}❌ Nginx process: NOT RUNNING${NC}"
        return 1
    fi
}

# Check disk space
check_disk_space() {
    log "Checking disk space..."
    
    # Get disk usage percentage for root filesystem
    disk_usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
    
    if [ "$disk_usage" -lt 90 ]; then
        log "${GREEN}✅ Disk space: OK (${disk_usage}% used)${NC}"
        return 0
    else
        log "${YELLOW}⚠️ Disk space: WARNING (${disk_usage}% used)${NC}"
        return 1
    fi
}

# Check memory usage
check_memory() {
    log "Checking memory usage..."
    
    # Get memory usage percentage
    memory_usage=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
    
    if [ "$memory_usage" -lt 90 ]; then
        log "${GREEN}✅ Memory usage: OK (${memory_usage}% used)${NC}"
        return 0
    else
        log "${YELLOW}⚠️ Memory usage: WARNING (${memory_usage}% used)${NC}"
        return 1
    fi
}

# Check if required files exist
check_files() {
    log "Checking required files..."
    
    required_files="/usr/share/nginx/html/index.html /etc/nginx/nginx.conf"
    
    for file in $required_files; do
        if [ -f "$file" ]; then
            log "${GREEN}✅ Required file exists: $file${NC}"
        else
            log "${RED}❌ Required file missing: $file${NC}"
            return 1
        fi
    done
    
    return 0
}

# Main health check function
main() {
    log "Starting TSConv health check..."
    
    local exit_code=0
    
    # Check nginx process
    if ! check_nginx; then
        exit_code=1
    fi
    
    # Check required files
    if ! check_files; then
        exit_code=1
    fi
    
    # Check health endpoint
    if ! check_endpoint "$HEALTH_URL" "200" "Health endpoint"; then
        exit_code=1
    fi
    
    # Check main application
    if ! check_endpoint "$APP_URL" "200" "Main application"; then
        exit_code=1
    fi
    
    # Check system resources
    if ! check_disk_space; then
        # Disk space warning doesn't fail health check
        log "${YELLOW}⚠️ Disk space warning (non-critical)${NC}"
    fi
    
    if ! check_memory; then
        # Memory warning doesn't fail health check
        log "${YELLOW}⚠️ Memory usage warning (non-critical)${NC}"
    fi
    
    # Final result
    if [ $exit_code -eq 0 ]; then
        log "${GREEN}✅ Health check: PASSED${NC}"
    else
        log "${RED}❌ Health check: FAILED${NC}"
    fi
    
    exit $exit_code
}

# Run health check with retries
retry_count=0
while [ $retry_count -lt $MAX_RETRIES ]; do
    if main; then
        exit 0
    fi
    
    retry_count=$((retry_count + 1))
    if [ $retry_count -lt $MAX_RETRIES ]; then
        log "${YELLOW}⚠️ Health check failed, retrying in 2 seconds... (attempt $retry_count/$MAX_RETRIES)${NC}"
        sleep 2
    fi
done

log "${RED}❌ Health check failed after $MAX_RETRIES attempts${NC}"
exit 1
