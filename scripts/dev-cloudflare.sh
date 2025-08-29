#!/bin/bash

# Build the project first
echo "Building project..."
npm run build

# Start wrangler pages dev server in the background
echo "Starting Cloudflare Pages dev server..."
npx wrangler pages dev dist --port 8788 &
WRANGLER_PID=$!

# Give wrangler time to start
sleep 3

# Start vite dev server with proxy to wrangler
echo "Starting Vite dev server..."
VITE_API_PROXY=http://localhost:8788 npm run dev

# Cleanup on exit
trap "kill $WRANGLER_PID" EXIT