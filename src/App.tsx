
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SuspenseFallback } from './components/SuspenseFallback';

// 懒加载组件
const TimestampConverter = lazy(() => import('./components/TimestampConverter'));
const ApiDocs = lazy(() => import('./components/ApiDocs'));
const EnhancedApiDocs = lazy(() => import('./components/EnhancedApiDocs'));
const Guide = lazy(() => import('./components/Guide'));
const HowTo = lazy(() => import('./components/HowTo'));
const HealthPage = lazy(() => import('./components/HealthPage'));

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <LanguageProvider>
          <Router>
            <Suspense fallback={<SuspenseFallback fullScreen message="Loading page..." />}>
              <Routes>
                <Route path="/" element={<TimestampConverter />} />
                <Route path="/api" element={<EnhancedApiDocs />} />
                <Route path="/api-docs" element={<ApiDocs />} />
                <Route path="/api/health" element={<HealthPage />} />
                <Route path="/guide" element={<Guide />} />
                <Route path="/guide/:articleId" element={<Guide />} />
                <Route path="/how-to" element={<HowTo />} />
                <Route path="/how-to/:articleId" element={<HowTo />} />
              </Routes>
            </Suspense>
          </Router>
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
