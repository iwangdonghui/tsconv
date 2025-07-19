import { useTheme } from '../contexts/ThemeContext';

export default function Footer() {
  const { isDark } = useTheme();

  return (
    <footer className={`border-t transition-colors duration-200 ${
      isDark 
        ? 'bg-slate-900 border-slate-700 text-slate-400' 
        : 'bg-white border-slate-200 text-slate-500'
    }`}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand Section */}
          <div>
            <h3 className="font-semibold text-lg mb-3 text-slate-900 dark:text-white">
              tsconv.com
            </h3>
            <p className="text-sm leading-relaxed">
              The fastest and most reliable timestamp conversion tool for developers worldwide.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-medium mb-3 text-slate-900 dark:text-white">
              Quick Links
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <button 
                  onClick={() => window.location.hash = ''}
                  className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  Timestamp Converter
                </button>
              </li>
              <li>
                <button 
                  onClick={() => window.location.hash = 'api'}
                  className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  API Documentation
                </button>
              </li>
              <li>
                <button 
                  onClick={() => window.location.hash = 'guide'}
                  className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  Developer Guides
                </button>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-medium mb-3 text-slate-900 dark:text-white">
              Resources
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a 
                  href="https://en.wikipedia.org/wiki/Unix_time" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  title="Learn more about Unix time on Wikipedia"
                  className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  About Unix Time
                </a>
              </li>
              <li>
                <a 
                  href="https://www.iana.org/time-zones" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  title="Official IANA Time Zone Database"
                  className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  IANA Time Zones
                </a>
              </li>
              <li>
                <a 
                  href="https://tools.ietf.org/html/rfc3339" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  title="RFC 3339 Date and Time on the Internet Standard"
                  className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  RFC 3339 Standard
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-xs">
              © 2025 tsconv.com. Built for developers, by developers.
            </p>
            <div className="flex items-center gap-4 text-xs">
              <span>Made with ❤️ for the developer community</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
