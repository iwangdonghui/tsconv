import { Moon, Sun, Menu, X } from "lucide-react";
import { useState } from "react";
import { useTheme } from "../contexts/ThemeContext";

interface HeaderProps {
  currentPage: 'converter' | 'api' | 'guide';
}

export default function Header({ currentPage }: HeaderProps) {
  const { isDark, toggleDarkMode } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleNavigation = (page: 'converter' | 'api' | 'guide') => {
    window.location.hash = page === 'converter' ? '' : page;
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 backdrop-blur-sm bg-white/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-700">
      <div className="flex justify-between items-center p-4 sm:p-6 max-w-4xl mx-auto">
        {/* Logo */}
        <button
          onClick={() => handleNavigation('converter')}
          className="text-xl font-semibold transition-colors hover:text-blue-600 dark:hover:text-blue-400"
        >
          tsconv.com
        </button>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          <button
            onClick={() => handleNavigation('converter')}
            className={`transition-colors ${
              currentPage === 'converter' 
                ? 'text-blue-600 dark:text-blue-400' 
                : 'hover:text-blue-600 dark:hover:text-blue-400'
            }`}
          >
            Converter
          </button>
          <button
            onClick={() => handleNavigation('api')}
            className={`transition-colors ${
              currentPage === 'api' 
                ? 'text-blue-600 dark:text-blue-400' 
                : 'hover:text-blue-600 dark:hover:text-blue-400'
            }`}
          >
            API
          </button>
          <button
            onClick={() => handleNavigation('guide')}
            className={`transition-colors ${
              currentPage === 'guide' 
                ? 'text-blue-600 dark:text-blue-400' 
                : 'hover:text-blue-600 dark:hover:text-blue-400'
            }`}
          >
            Guides
          </button>
        </nav>

        {/* Right side buttons */}
        <div className="flex items-center gap-2">
          {/* Theme toggle */}
          <button
            onClick={toggleDarkMode}
            className={`p-2 rounded-lg transition-colors ${
              isDark 
                ? 'hover:bg-slate-800 text-slate-300' 
                : 'hover:bg-slate-100 text-slate-600'
            }`}
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={`md:hidden p-2 rounded-lg transition-colors ${
              isDark 
                ? 'hover:bg-slate-800 text-slate-300' 
                : 'hover:bg-slate-100 text-slate-600'
            }`}
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {isMobileMenuOpen && (
        <div className={`md:hidden border-t ${
          isDark ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-white'
        }`}>
          <nav className="flex flex-col p-4 space-y-2">
            <button
              onClick={() => handleNavigation('converter')}
              className={`text-left p-3 rounded-lg transition-colors ${
                currentPage === 'converter' 
                  ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20' 
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Converter
            </button>
            <button
              onClick={() => handleNavigation('api')}
              className={`text-left p-3 rounded-lg transition-colors ${
                currentPage === 'api' 
                  ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20' 
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              API
            </button>
            <button
              onClick={() => handleNavigation('guide')}
              className={`text-left p-3 rounded-lg transition-colors ${
                currentPage === 'guide' 
                  ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20' 
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Guides
            </button>
          </nav>
        </div>
      )}
    </header>
  );
}
