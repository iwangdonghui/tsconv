import React, { useState, useEffect } from 'react';
import './index.css';

// 简化的时间戳转换器组件，不使用任何外部 UI 库
function SimpleTimestampConverter() {
  const [timestamp, setTimestamp] = useState(Math.floor(Date.now() / 1000));
  const [dateInput, setDateInput] = useState('');
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // 检测系统主题偏好
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDark(prefersDark);
    
    // 设置当前时间
    const now = new Date();
    setDateInput(now.toISOString().slice(0, 16));
  }, []);

  useEffect(() => {
    // 应用主题
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const handleTimestampChange = (value: string) => {
    const ts = parseInt(value);
    if (!isNaN(ts) && ts > 0) {
      setTimestamp(ts);
      const date = new Date(ts * 1000);
      setDateInput(date.toISOString().slice(0, 16));
    }
  };

  const handleDateChange = (value: string) => {
    setDateInput(value);
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      setTimestamp(Math.floor(date.getTime() / 1000));
    }
  };

  const updateToNow = () => {
    const now = Math.floor(Date.now() / 1000);
    setTimestamp(now);
    setDateInput(new Date().toISOString().slice(0, 16));
  };

  const formatDate = (ts: number) => {
    try {
      return new Date(ts * 1000).toLocaleString('zh-CN', {
        timeZone: 'Asia/Shanghai',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (error) {
      return new Date(ts * 1000).toLocaleString();
    }
  };

  return (
    <div className={`min-h-screen p-4 transition-colors duration-300 ${
      isDark ? 'bg-gray-900 text-white' : 'bg-gradient-to-br from-blue-500 to-purple-600 text-white'
    }`}>
      {/* Header */}
      <header className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2">时间戳转换器</h1>
        <p className="text-lg opacity-90">Unix时间戳与日期时间双向转换工具</p>
        <button
          onClick={() => setIsDark(!isDark)}
          className="mt-4 px-4 py-2 rounded-lg bg-white bg-opacity-20 hover:bg-opacity-30 transition-all duration-200"
        >
          {isDark ? '🌞 浅色模式' : '🌙 深色模式'}
        </button>
      </header>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto">
        {/* Current Time Card */}
        <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-xl p-6 mb-6 border border-white border-opacity-20">
          <h2 className="text-xl font-semibold mb-4">当前时间</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm opacity-75 mb-1">时间戳</p>
              <p className="text-2xl font-mono">{Math.floor(Date.now() / 1000)}</p>
            </div>
            <div>
              <p className="text-sm opacity-75 mb-1">日期时间</p>
              <p className="text-lg">{formatDate(Math.floor(Date.now() / 1000))}</p>
            </div>
          </div>
          <button
            onClick={updateToNow}
            className="mt-4 px-6 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors duration-200"
          >
            更新到当前时间
          </button>
        </div>

        {/* Converter Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Timestamp to Date */}
          <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-xl p-6 border border-white border-opacity-20">
            <h3 className="text-lg font-semibold mb-4">时间戳转日期</h3>
            <input
              type="number"
              value={timestamp}
              onChange={(e) => handleTimestampChange(e.target.value)}
              className="w-full p-3 rounded-lg bg-white bg-opacity-20 border border-white border-opacity-30 placeholder-white placeholder-opacity-70 text-white"
              placeholder="输入时间戳"
            />
            <div className="mt-4 p-3 bg-black bg-opacity-20 rounded-lg">
              <p className="text-sm opacity-75 mb-1">转换结果</p>
              <p className="font-mono">{formatDate(timestamp)}</p>
            </div>
          </div>

          {/* Date to Timestamp */}
          <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-xl p-6 border border-white border-opacity-20">
            <h3 className="text-lg font-semibold mb-4">日期转时间戳</h3>
            <input
              type="datetime-local"
              value={dateInput}
              onChange={(e) => handleDateChange(e.target.value)}
              className="w-full p-3 rounded-lg bg-white bg-opacity-20 border border-white border-opacity-30 text-white"
            />
            <div className="mt-4 p-3 bg-black bg-opacity-20 rounded-lg">
              <p className="text-sm opacity-75 mb-1">转换结果</p>
              <p className="font-mono text-xl">{timestamp}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center mt-12 opacity-75">
        <p>© 2024 时间戳转换器 - 免费在线工具</p>
        <p className="text-sm mt-2">简化版本 - 无外部依赖</p>
      </footer>
    </div>
  );
}

function MinimalApp() {
  return (
    <React.StrictMode>
      <SimpleTimestampConverter />
    </React.StrictMode>
  );
}

export default MinimalApp;
