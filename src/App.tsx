
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { lazy } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LazyWrapper } from './components/ui/lazy-wrapper';

// 懒加载组件 - 核心转换工具
const TimestampConverter = lazy(() => import('./components/TimestampConverter'));
const FormatTool = lazy(() => import('./components/FormatTool'));

// 懒加载组件 - 计算器工具
const WorkdaysCalculator = lazy(() => import('./components/WorkdaysCalculator'));
const DateDiffCalculator = lazy(() => import('./components/DateDiffCalculator'));
const TimezoneExplorer = lazy(() => import('./components/TimezoneExplorer'));

// 懒加载组件 - 文档和指南
const ApiDocs = lazy(() => import('./components/ApiDocs'));
const EnhancedApiDocs = lazy(() => import('./components/EnhancedApiDocs'));
const Guide = lazy(() => import('./components/Guide'));
const HowTo = lazy(() => import('./components/HowTo'));

// 懒加载组件 - 系统页面
const HealthPage = lazy(() => import('./components/HealthPage'));

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <LanguageProvider>
          <Router>
            <Routes>
                <Route path="/" element={
                  <LazyWrapper name="Timestamp Converter" fullPage>
                    <TimestampConverter />
                  </LazyWrapper>
                } />

                <Route path="/api" element={
                  <LazyWrapper name="Enhanced API Docs" fullPage>
                    <EnhancedApiDocs />
                  </LazyWrapper>
                } />

                <Route path="/api-docs" element={
                  <LazyWrapper name="API Documentation" fullPage>
                    <ApiDocs />
                  </LazyWrapper>
                } />

                <Route path="/api/health" element={
                  <LazyWrapper name="Health Status" fullPage>
                    <HealthPage />
                  </LazyWrapper>
                } />

                <Route path="/guide" element={
                  <LazyWrapper name="User Guide" fullPage>
                    <Guide />
                  </LazyWrapper>
                } />

                <Route path="/guide/:articleId" element={
                  <LazyWrapper name="Guide Article" fullPage>
                    <Guide />
                  </LazyWrapper>
                } />

                <Route path="/how-to" element={
                  <LazyWrapper name="How-To Guides" fullPage>
                    <HowTo />
                  </LazyWrapper>
                } />

                <Route path="/how-to/:articleId" element={
                  <LazyWrapper name="How-To Article" fullPage>
                    <HowTo />
                  </LazyWrapper>
                } />

                {/* 新功能页面 */}
                <Route path="/workdays" element={
                  <LazyWrapper name="Workdays Calculator" fullPage>
                    <WorkdaysCalculator />
                  </LazyWrapper>
                } />

                <Route path="/date-diff" element={
                  <LazyWrapper name="Date Difference Calculator" fullPage>
                    <DateDiffCalculator />
                  </LazyWrapper>
                } />

                <Route path="/format" element={
                  <LazyWrapper name="Format Tool" fullPage>
                    <FormatTool />
                  </LazyWrapper>
                } />

                <Route path="/timezones" element={
                  <LazyWrapper name="Timezone Explorer" fullPage>
                    <TimezoneExplorer />
                  </LazyWrapper>
                } />
              </Routes>
          </Router>
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
