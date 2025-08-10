import React from 'react';
import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import { LanguageProvider } from './contexts/LanguageContext';
import { ThemeProvider } from './contexts/ThemeContext';

// 简化的错误边界
class SimpleErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    console.error('ErrorBoundary caught error:', error);
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary componentDidCatch:', error, errorInfo);
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
          <h1>Something went wrong</h1>
          <p>Error: {this.state.error?.message}</p>
          <button onClick={() => this.setState({ hasError: false })}>Try again</button>
        </div>
      );
    }

    return this.props.children;
  }
}

// 简化的时间戳转换器
function DebugTimestampConverter() {
  const [timestamp, setTimestamp] = React.useState(Math.floor(Date.now() / 1000));
  const [date, setDate] = React.useState(new Date().toISOString().slice(0, 16));

  console.log('DebugTimestampConverter rendering');

  const handleTimestampChange = (value: string) => {
    const ts = parseInt(value);
    if (!isNaN(ts)) {
      setTimestamp(ts);
    }
  };

  const handleDateChange = (value: string) => {
    setDate(value);
    const newTimestamp = Math.floor(new Date(value).getTime() / 1000);
    if (!isNaN(newTimestamp)) {
      setTimestamp(newTimestamp);
    }
  };

  return (
    <div
      style={{
        padding: '20px',
        fontFamily: 'Arial, sans-serif',
        maxWidth: '800px',
        margin: '0 auto',
      }}
    >
      <h1>Debug Timestamp Converter</h1>

      <div style={{ marginBottom: '20px' }}>
        <h2>Current Time</h2>
        <p>Timestamp: {Math.floor(Date.now() / 1000)}</p>
        <p>Date: {new Date().toLocaleString()}</p>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h2>Convert Timestamp</h2>
        <div style={{ marginBottom: '10px' }}>
          <label>
            Timestamp:
            <input
              type='number'
              value={timestamp}
              onChange={e => handleTimestampChange(e.target.value)}
              style={{ margin: '0 10px', padding: '5px', width: '200px' }}
            />
          </label>
        </div>
        <div>
          <strong>Date:</strong> {new Date(timestamp * 1000).toLocaleString()}
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h2>Convert Date</h2>
        <div style={{ marginBottom: '10px' }}>
          <label>
            Date:
            <input
              type='datetime-local'
              value={date}
              onChange={e => handleDateChange(e.target.value)}
              style={{ margin: '0 10px', padding: '5px' }}
            />
          </label>
        </div>
        <div>
          <strong>Timestamp:</strong> {timestamp}
        </div>
      </div>

      <div
        style={{
          marginTop: '40px',
          padding: '20px',
          backgroundColor: '#f5f5f5',
          borderRadius: '8px',
        }}
      >
        <h3>Debug Info</h3>
        <p>React is working: ✅</p>
        <p>State management: ✅</p>
        <p>Event handlers: ✅</p>
        <p>Date calculations: ✅</p>
      </div>
    </div>
  );
}

export default function DebugApp() {
  console.log('DebugApp is rendering');

  return (
    <SimpleErrorBoundary>
      <ThemeProvider>
        <LanguageProvider>
          <Router>
            <Routes>
              <Route path='/' element={<DebugTimestampConverter />} />
              <Route
                path='*'
                element={
                  <div style={{ padding: '20px', textAlign: 'center' }}>
                    <h1>Page not found</h1>
                    <a href='/'>Go home</a>
                  </div>
                }
              />
            </Routes>
          </Router>
        </LanguageProvider>
      </ThemeProvider>
    </SimpleErrorBoundary>
  );
}
