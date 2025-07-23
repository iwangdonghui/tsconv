#!/bin/bash

# Start development servers for tsconv

echo "🚀 Starting tsconv development servers..."
echo ""

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed or not in PATH"
    exit 1
fi

# Check if dev-server.js exists
if [ ! -f "dev-server.js" ]; then
    echo "❌ dev-server.js not found"
    exit 1
fi

# Install dev dependencies if not already installed
if [ ! -d "node_modules/express" ]; then
    echo "📦 Installing development dependencies..."
    npm install express cors
fi

echo "🔧 Starting API server on http://localhost:3000..."
node dev-server.js &
API_PID=$!

# Wait a moment for the API server to start
sleep 2

echo "⚡ Starting Vite dev server on http://localhost:5173..."
npm run dev &
VITE_PID=$!

echo ""
echo "✅ Development servers are running!"
echo "📱 Frontend: http://localhost:5173"
echo "🔌 API: http://localhost:3000"
echo ""
echo "🔗 Test endpoints:"
echo "   http://localhost:3000/api/convert?timestamp=1753118988"
echo "   http://localhost:3000/api/formats"
echo "   http://localhost:3000/api/now"
echo "   http://localhost:3000/api/health"
echo ""
echo "Press Ctrl+C to stop all servers"

# Handle script termination
trap "echo ''; echo '🛑 Stopping servers...'; kill $API_PID $VITE_PID 2>/dev/null; exit" INT TERM

# Wait for both processes
wait $API_PID $VITE_PID