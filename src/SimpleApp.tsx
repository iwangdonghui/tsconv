import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// 简化的时间戳转换器组件
function SimpleTimestampConverter() {
  const [timestamp, setTimestamp] = React.useState(Math.floor(Date.now() / 1000));
  
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Simple Timestamp Converter</h1>
      <div>
        <label>
          Timestamp: 
          <input 
            type="number" 
            value={timestamp} 
            onChange={(e) => setTimestamp(Number(e.target.value))}
            style={{ margin: '0 10px', padding: '5px' }}
          />
        </label>
      </div>
      <div style={{ marginTop: '10px' }}>
        <strong>Date:</strong> {new Date(timestamp * 1000).toLocaleString()}
      </div>
      <div style={{ marginTop: '10px' }}>
        <strong>Current Time:</strong> {new Date().toLocaleString()}
      </div>
    </div>
  );
}

export default function SimpleApp() {
  console.log('SimpleApp is rendering');
  
  return (
    <Router>
      <Routes>
        <Route path="/" element={<SimpleTimestampConverter />} />
        <Route path="*" element={<div>Page not found</div>} />
      </Routes>
    </Router>
  );
}
