import { Moon, Sun, Menu, X, Globe } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from "../contexts/ThemeContext";
import { useLanguage } from "../contexts/LanguageContext";

const navigation = [
  { name: 'Timestamp Converter', href: '/' },
  { name: 'API', href: '/api' },
  { name: 'Guide', href: '/guide' },
  { name: 'How To', href: '/how-to' },
];

export default function Header() {
  const { isDark, toggleDarkMode } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <header className={`sticky top-0 z-50 border-b transition-colors duration-200 ${
      isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="text-2xl">🕐</div>
            <span className="text-xl font-bold">tsconv</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-8">
            <Link
              to="/"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive('/') 
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              {t('nav.converter')}
            </Link>
            <Link
              to="/api"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive('/api')
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              {t('nav.api')}
            </Link>
            <Link
              to="/guide"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive('/guide')
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              {t('nav.guide')}
            </Link>
            <Link
              to="/how-to"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive('/how-to')
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              {t('nav.howto')}
            </Link>
          </nav>

          {/* Controls */}
          <div className="flex items-center space-x-2">
            {/* Language Selector */}
            <div className="relative">
              <button
                onClick={() => setIsLanguageMenuOpen(!isLanguageMenuOpen)}
                className={`p-2 rounded-lg transition-colors ${
                  isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'
                }`}
              >
                <Globe className="w-5 h-5" />
              </button>
              
              {isLanguageMenuOpen && (
                <div className={`absolute right-0 mt-2 w-32 rounded-md shadow-lg ${
                  isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-slate-200'
                }`}>
                  <div className="py-1">
                    <button
                      onClick={() => {
                        setLanguage('en');
                        setIsLanguageMenuOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                        language === 'en' 
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      🇺🇸 English
                    </button>
                    <button
                      onClick={() => {
                        setLanguage('zh');
                        setIsLanguageMenuOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                        language === 'zh' 
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      🇨🇳 中文
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Theme Toggle */}
            <button
              onClick={toggleDarkMode}
              className={`p-2 rounded-lg transition-colors ${
                isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'
              }`}
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className={`md:hidden p-2 rounded-lg transition-colors ${
                isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'
              }`}
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-slate-200 dark:border-slate-700">
            <div className="space-y-2">
              <Link
                to="/"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/') 
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                {t('nav.converter')}
              </Link>
              <Link
                to="/api"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/api')
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                {t('nav.api')}
              </Link>
              <Link
                to="/guide"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/guide')
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                {t('nav.guide')}
              </Link>
              <Link
                to="/how-to"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/how-to')
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                {t('nav.howto')}
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
