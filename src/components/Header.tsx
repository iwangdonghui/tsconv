import { Moon, Sun, Menu, X, Globe } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTheme } from "../contexts/ThemeContext";
import { useLanguage } from "../contexts/LanguageContext";

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
      if (
        languageMenuRef.current &&
        !languageMenuRef.current.contains(event.target as Node)
      ) {
        setIsLanguageMenuOpen(false);
      }
    }

    // Handle keyboard navigation
    function handleKeyDown(event: KeyboardEvent) {
      // Close language menu on Escape
      if (event.key === "Escape" && isLanguageMenuOpen) {
        setIsLanguageMenuOpen(false);
      }

      // Close mobile menu on Escape
      if (event.key === "Escape" && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isLanguageMenuOpen, isMobileMenuOpen]);

  const isActive = (path: string) => {
    if (path === "/" && location.pathname === "/") return true;
    if (path !== "/" && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <header
      className={`sticky top-0 z-50 border-b transition-colors duration-200 ${
        isDark ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <span className="text-xl font-bold">tsconv.com</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-8">
            <Link
              to="/"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive("/")
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                  : "hover:bg-slate-100 dark:hover:bg-slate-700"
              }`}
            >
              {t("nav.converter")}
            </Link>
            <Link
              to="/api"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive("/api")
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                  : "hover:bg-slate-100 dark:hover:bg-slate-700"
              }`}
            >
              {t("nav.api")}
            </Link>
            <Link
              to="/guide"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive("/guide")
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                  : "hover:bg-slate-100 dark:hover:bg-slate-700"
              }`}
            >
              {t("nav.guide")}
            </Link>
            <Link
              to="/how-to"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive("/how-to")
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                  : "hover:bg-slate-100 dark:hover:bg-slate-700"
              }`}
            >
              {t("nav.howto")}
            </Link>
          </nav>

          {/* Controls */}
          <div className="flex items-center space-x-2">
            {/* Language Selector */}
            <div className="relative">
              <button
                id="language-menu-button"
                onClick={() => setIsLanguageMenuOpen(!isLanguageMenuOpen)}
                aria-label={t("header.language.toggle")}
                aria-expanded={isLanguageMenuOpen}
                aria-haspopup="menu"
                className={`p-2 rounded-lg transition-colors ${
                  isDark ? "hover:bg-slate-700" : "hover:bg-slate-100"
                }`}
              >
                <Globe className="w-5 h-5" />
              </button>

              {isLanguageMenuOpen && (
                <div
                  ref={languageMenuRef}
                  className={`absolute right-0 mt-2 w-32 rounded-md shadow-lg ${
                    isDark
                      ? "bg-slate-800 border border-slate-700"
                      : "bg-white border border-slate-200"
                  }`}
                  role="menu"
                  aria-orientation="vertical"
                  aria-labelledby="language-menu-button"
                >
                  <div className="py-1" role="none">
                    <button
                      onClick={() => {
                        setLanguage("en");
                        setIsLanguageMenuOpen(false);
                      }}
                      role="menuitem"
                      aria-label={t("header.language.english")}
                      className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                        language === "en"
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                          : "hover:bg-slate-100 dark:hover:bg-slate-700"
                      }`}
                    >
                      <span aria-hidden="true">🇺🇸</span> English
                    </button>
                    <button
                      onClick={() => {
                        setLanguage("zh");
                        setIsLanguageMenuOpen(false);
                      }}
                      role="menuitem"
                      aria-label={t("header.language.chinese")}
                      className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                        language === "zh"
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                          : "hover:bg-slate-100 dark:hover:bg-slate-700"
                      }`}
                    >
                      <span aria-hidden="true">🇨🇳</span> 中文
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Theme Toggle */}
            <button
              onClick={toggleDarkMode}
              aria-label={
                isDark ? t("header.theme.light") : t("header.theme.dark")
              }
              title={isDark ? t("header.theme.light") : t("header.theme.dark")}
              className={`p-2 rounded-lg transition-colors ${
                isDark ? "hover:bg-slate-700" : "hover:bg-slate-100"
              }`}
            >
              {isDark ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </button>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label={
                isMobileMenuOpen
                  ? t("header.menu.close")
                  : t("header.menu.open")
              }
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-menu"
              className={`md:hidden p-2 rounded-lg transition-colors ${
                isDark ? "hover:bg-slate-700" : "hover:bg-slate-100"
              }`}
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div
            id="mobile-menu"
            className="md:hidden py-4 border-t border-slate-200 dark:border-slate-700"
            role="navigation"
            aria-label={t("header.menu.navigation")}
          >
            <div className="space-y-2">
              <Link
                to="/"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive("/")
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                    : "hover:bg-slate-100 dark:hover:bg-slate-700"
                }`}
              >
                {t("nav.converter")}
              </Link>
              <Link
                to="/api"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive("/api")
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                    : "hover:bg-slate-100 dark:hover:bg-slate-700"
                }`}
              >
                {t("nav.api")}
              </Link>
              <Link
                to="/guide"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive("/guide")
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                    : "hover:bg-slate-100 dark:hover:bg-slate-700"
                }`}
              >
                {t("nav.guide")}
              </Link>
              <Link
                to="/how-to"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive("/how-to")
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                    : "hover:bg-slate-100 dark:hover:bg-slate-700"
                }`}
              >
                {t("nav.howto")}
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
