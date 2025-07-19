
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';

// 懒加载组件
const TimestampConverter = lazy(() => import('./components/TimestampConverter'));
const ApiDocs = lazy(() => import('./components/ApiDocs'));
const Guide = lazy(() => import('./components/Guide'));

function App() {
  return (
    <ThemeProvider>
      <Router>
        <Suspense fallback={<div>Loading...</div>}>
          <Routes>
            <Route path="/" element={<TimestampConverter />} />
            <Route path="/api" element={<ApiDocs />} />
            <Route path="/guide" element={<Guide />} />
            <Route path="/guide/:articleId" element={<Guide />} />
          </Routes>
        </Suspense>
      </Router>
    </ThemeProvider>
  );
}

export default App;
