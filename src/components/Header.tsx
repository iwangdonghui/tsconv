import { Globe, Menu, Moon, Sun, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';

export default function Header() {
  const { isDark, toggleDarkMode } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
  const location = useLocation();
  const languageMenuRef = useRef<HTMLDivElement>(null);

  // Close language menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (languageMenuRef.current && !languageMenuRef.current.contains(event.target as Node)) {
        setIsLanguageMenuOpen(false);
      }
    }

    // Handle keyboard navigation
    function handleKeyDown(event: KeyboardEvent) {
      // Close language menu on Escape
      if (event.key === 'Escape' && isLanguageMenuOpen) {
        setIsLanguageMenuOpen(false);
      }

      // Close mobile menu on Escape
      if (event.key === 'Escape' && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isLanguageMenuOpen, isMobileMenuOpen]);

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <header
      className={`sticky top-0 z-50 border-b transition-colors duration-200 ${
        isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
      }`}
    >
      <div className='max-w-7xl mx-auto px-4 sm:px-6'>
        <div className='flex justify-between items-center h-16'>
          {/* Logo */}
          <Link to='/' className='flex items-center space-x-2'>
            <span className='text-xl font-bold'>tsconv.com</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className='hidden md:flex space-x-8'>
            <Link
              to='/'
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive('/')
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              {t('nav.converter')}
            </Link>
            <Link
              to='/api'
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive('/api')
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              {t('nav.api')}
            </Link>
            <Link
              to='/guide'
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive('/guide')
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              {t('nav.guide')}
            </Link>
            <Link
              to='/how-to'
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive('/how-to')
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              {t('nav.howto')}
            </Link>

            {/* Tools Dropdown */}
            <div className='relative group'>
              <button className='px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-1'>
                Tools
                <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M19 9l-7 7-7-7'
                  />
                </svg>
              </button>

              <div className='absolute left-0 mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50'>
                <div className='py-1'>
                  <Link
                    to='/workdays'
                    className='block px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors'
                  >
                    📅 Workdays Calculator
                  </Link>
                  <Link
                    to='/date-diff'
                    className='block px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors'
                  >
                    📊 Date Difference
                  </Link>
                  <Link
                    to='/format'
                    className='block px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors'
                  >
                    🎨 Format Tool
                  </Link>
                  <Link
                    to='/timezones'
                    className='block px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors'
                  >
                    🌍 Timezone Explorer
                  </Link>
                  <Link
                    to='/time-units'
                    className='block px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors'
                  >
                    ⏱️ Time Units Converter
                  </Link>
                </div>
              </div>
            </div>
          </nav>

          {/* Controls */}
          <div className='flex items-center space-x-2'>
            {/* Language Selector */}
            <div className='relative'>
              <button
                id='language-menu-button'
                onClick={() => setIsLanguageMenuOpen(!isLanguageMenuOpen)}
                aria-label={t('header.language.toggle')}
                aria-expanded={isLanguageMenuOpen}
                aria-haspopup='menu'
                className={`p-2 rounded-lg transition-colors ${
                  isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'
                }`}
              >
                <Globe className='w-5 h-5' />
              </button>

              {isLanguageMenuOpen && (
                <div
                  ref={languageMenuRef}
                  className={`absolute right-0 mt-2 w-32 rounded-md shadow-lg ${
                    isDark
                      ? 'bg-slate-800 border border-slate-700'
                      : 'bg-white border border-slate-200'
                  }`}
                  role='menu'
                  aria-orientation='vertical'
                  aria-labelledby='language-menu-button'
                >
                  <div className='py-1' role='none'>
                    <button
                      onClick={() => {
                        setLanguage('en');
                        setIsLanguageMenuOpen(false);
                      }}
                      role='menuitem'
                      aria-label={t('header.language.english')}
                      className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                        language === 'en'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      <span aria-hidden='true'>🇺🇸</span> English
                    </button>
                    <button
                      onClick={() => {
                        setLanguage('zh');
                        setIsLanguageMenuOpen(false);
                      }}
                      role='menuitem'
                      aria-label={t('header.language.chinese')}
                      className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                        language === 'zh'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      <span aria-hidden='true'>🇨🇳</span> 中文
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Theme Toggle */}
            <button
              onClick={toggleDarkMode}
              aria-label={isDark ? t('header.theme.light') : t('header.theme.dark')}
              title={isDark ? t('header.theme.light') : t('header.theme.dark')}
              className={`p-2 rounded-lg transition-colors ${
                isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'
              }`}
            >
              {isDark ? <Sun className='w-5 h-5' /> : <Moon className='w-5 h-5' />}
            </button>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label={isMobileMenuOpen ? t('header.menu.close') : t('header.menu.open')}
              aria-expanded={isMobileMenuOpen}
              aria-controls='mobile-menu'
              className={`md:hidden p-2 rounded-lg transition-colors ${
                isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'
              }`}
            >
              {isMobileMenuOpen ? <X className='w-5 h-5' /> : <Menu className='w-5 h-5' />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div
            id='mobile-menu'
            className='md:hidden py-4 border-t border-slate-200 dark:border-slate-700'
            role='navigation'
            aria-label={t('header.menu.navigation')}
          >
            <div className='space-y-2'>
              <Link
                to='/'
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
                to='/api'
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
                to='/guide'
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
                to='/how-to'
                onClick={() => setIsMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/how-to')
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                {t('nav.howto')}
              </Link>

              {/* Tools Section */}
              <div className='pt-2 border-t border-slate-200 dark:border-slate-700 mt-2'>
                <div className='px-3 py-1 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider'>
                  Tools
                </div>
                <Link
                  to='/workdays'
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive('/workdays')
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  📅 Workdays Calculator
                </Link>
                <Link
                  to='/date-diff'
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive('/date-diff')
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  📊 Date Difference
                </Link>
                <Link
                  to='/format'
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive('/format')
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  🎨 Format Tool
                </Link>
                <Link
                  to='/timezones'
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive('/timezones')
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  🌍 Timezone Explorer
                </Link>
                <Link
                  to='/time-units'
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive('/time-units')
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  ⏱️ Time Units Converter
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
