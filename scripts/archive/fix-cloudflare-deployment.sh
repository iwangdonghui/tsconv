#!/bin/bash

# 🌐 Cloudflare Deployment Fix Script
# This script helps diagnose and fix common Cloudflare Pages deployment issues

echo "🌐 TSConv Cloudflare Deployment Fix Script"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

print_info "Checking project structure..."

# Check if API config exists
if [ -f "src/config/api.ts" ]; then
    print_status "API configuration file exists"
else
    print_error "API configuration file missing"
    echo "Creating src/config/api.ts..."
    mkdir -p src/config
    cat > src/config/api.ts << 'EOF'
// API configuration for different environments
export const getApiBaseUrl = (): string => {
  const configuredUrl = import.meta.env.VITE_API_BASE_URL;
  if (configuredUrl) return configuredUrl;

  if (import.meta.env.DEV) return '';
  
  const currentHost = window.location.host;
  if (currentHost.includes('pages.dev') || currentHost.includes('cloudflare')) {
    return 'https://tsconv.vercel.app/api';
  }
  
  return '/api';
};

export const buildApiUrl = (endpoint: string): string => {
  const baseUrl = getApiBaseUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  
  if (baseUrl === '') return `/${cleanEndpoint}`;
  return `${baseUrl}/${cleanEndpoint}`;
};

export const API_ENDPOINTS = {
  FORMAT: 'api/format',
  FORMAT_TEMPLATES: 'api/format/templates',
  TIMEZONES: 'api/timezones',
  WORKDAYS: 'api/workdays',
  CONVERT: 'api/convert',
  HEALTH: 'api/health',
} as const;
EOF
    print_status "Created API configuration file"
fi

# Check if production env file exists
if [ -f ".env.production" ]; then
    print_status "Production environment file exists"
else
    print_warning "Creating .env.production file..."
    cat > .env.production << 'EOF'
# Production environment variables for Cloudflare deployment
VITE_API_BASE_URL=https://tsconv.vercel.app/api
VITE_SENTRY_DSN=https://d0d6b88f91bceb0ac4db9979e9f41fd9@o4509814924640256.ingest.us.sentry.io/4509815049486336
VITE_APP_VERSION=1.0.0
VITE_ENABLE_ERROR_TRACKING=true
VITE_ENABLE_PERFORMANCE_MONITORING=true
VITE_ENABLE_USER_FEEDBACK=false
VITE_ENABLE_ERROR_DASHBOARD=false
VITE_ENABLE_DEBUG_MODE=false
VITE_PERFORMANCE_SAMPLE_RATE=0.1
VITE_ENABLE_WEB_VITALS=true
VITE_ENABLE_RESOURCE_TIMING=true
VITE_ENABLE_MEMORY_MONITORING=false
VITE_PERFORMANCE_DASHBOARD=false
EOF
    print_status "Created .env.production file"
fi

# Test API endpoints
print_info "Testing API endpoints..."

# Test Vercel API health
if curl -s "https://tsconv.vercel.app/api/health" > /dev/null; then
    print_status "Vercel API health endpoint is accessible"
else
    print_error "Vercel API health endpoint is not accessible"
fi

# Test format templates endpoint
if curl -s "https://tsconv.vercel.app/api/format/templates" > /dev/null; then
    print_status "Format templates endpoint is accessible"
else
    print_error "Format templates endpoint is not accessible"
fi

# Build test
print_info "Testing production build..."
if npm run build > /dev/null 2>&1; then
    print_status "Production build successful"
else
    print_error "Production build failed"
    echo "Run 'npm run build' to see detailed error messages"
fi

# Check for common issues in components
print_info "Checking component API usage..."

# Check if components use the API config
if grep -q "buildApiUrl\|API_ENDPOINTS" src/components/FormatTool.tsx; then
    print_status "FormatTool.tsx uses API configuration"
else
    print_warning "FormatTool.tsx may need API configuration updates"
fi

if grep -q "buildApiUrl\|API_ENDPOINTS" src/components/TimezoneExplorer.tsx; then
    print_status "TimezoneExplorer.tsx uses API configuration"
else
    print_warning "TimezoneExplorer.tsx may need API configuration updates"
fi

if grep -q "buildApiUrl\|API_ENDPOINTS" src/components/WorkdaysCalculator.tsx; then
    print_status "WorkdaysCalculator.tsx uses API configuration"
else
    print_warning "WorkdaysCalculator.tsx may need API configuration updates"
fi

echo ""
echo "🎯 Cloudflare Pages Environment Variables"
echo "========================================"
echo "Add these to your Cloudflare Pages dashboard:"
echo ""
echo "VITE_API_BASE_URL=https://tsconv.vercel.app/api"
echo "VITE_SENTRY_DSN=https://d0d6b88f91bceb0ac4db9979e9f41fd9@o4509814924640256.ingest.us.sentry.io/4509815049486336"
echo "VITE_APP_VERSION=1.0.0"
echo "VITE_ENABLE_ERROR_TRACKING=true"
echo "VITE_ENABLE_PERFORMANCE_MONITORING=true"
echo ""

echo "🚀 Next Steps:"
echo "1. Commit and push changes to GitHub"
echo "2. Set environment variables in Cloudflare Pages dashboard"
echo "3. Trigger a new deployment"
echo "4. Test the deployed site"
echo ""

print_status "Cloudflare deployment fix script completed!"
