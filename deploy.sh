#!/bin/bash
# Production deployment script for timestamp converter API
# This script deploys the application to Vercel with production configuration

# Exit on error
set -e

# Load environment variables from .env file if it exists
if [ -f .env ]; then
  echo "Loading environment variables from .env file"
  export $(grep -v '^#' .env | xargs)
fi

# Check for required environment variables
if [ -z "$VERCEL_TOKEN" ]; then
  echo "Error: VERCEL_TOKEN environment variable is required"
  exit 1
fi

# Set environment to production
export NODE_ENV=production

# Install dependencies
echo "Installing dependencies..."
npm ci

# Run tests
echo "Running tests..."
npm test

# Build the application
echo "Building application..."
npm run build

# Set up Redis for production
if [ -z "$REDIS_URL" ] && [ -z "$KV_URL" ]; then
  echo "Warning: No Redis URL provided. Using Vercel KV or falling back to in-memory cache"
fi

# Configure rate limiting for production
echo "Configuring rate limiting..."
if [ -z "$ANONYMOUS_RATE_LIMIT" ]; then
  export ANONYMOUS_RATE_LIMIT=100
  echo "Setting default anonymous rate limit: $ANONYMOUS_RATE_LIMIT requests per minute"
fi

if [ -z "$AUTHENTICATED_RATE_LIMIT" ]; then
  export AUTHENTICATED_RATE_LIMIT=1000
  echo "Setting default authenticated rate limit: $AUTHENTICATED_RATE_LIMIT requests per minute"
fi

# Configure monitoring
echo "Configuring monitoring..."
export METRICS_ENABLED=true
export LOG_LEVEL=info

# Deploy to Vercel
echo "Deploying to Vercel..."
npx vercel deploy --prod --token $VERCEL_TOKEN

# Set up monitoring dashboards
echo "Setting up monitoring dashboards..."
if [ ! -z "$DATADOG_API_KEY" ]; then
  echo "Configuring Datadog monitoring..."
  # Add Datadog setup commands here
fi

if [ ! -z "$NEW_RELIC_LICENSE_KEY" ]; then
  echo "Configuring New Relic monitoring..."
  # Add New Relic setup commands here
fi

# Set up alerts
echo "Setting up alerts..."
if [ ! -z "$PAGERDUTY_ROUTING_KEY" ]; then
  echo "Configuring PagerDuty alerts..."
  # Add PagerDuty setup commands here
fi

echo "Deployment complete!"