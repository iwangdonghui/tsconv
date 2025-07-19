import { Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';

export default function Footer() {
  const { isDark } = useTheme();
  const { t } = useLanguage();

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
              {t('footer.brand.title')}
            </h3>
            <p className="text-sm leading-relaxed">
              {t('footer.brand.description')}
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-medium mb-3 text-slate-900 dark:text-white">
              {t('footer.links.title')}
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link 
                  to="/"
                  className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  {t('footer.links.converter')}
                </Link>
              </li>
              <li>
                <Link 
                  to="/api"
                  className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  {t('footer.links.api')}
                </Link>
              </li>
              <li>
                <Link 
                  to="/guide"
                  className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  {t('footer.links.guide')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-medium mb-3 text-slate-900 dark:text-white">
              {t('footer.resources.title')}
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
                  {t('footer.resources.unix')}
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
                  {t('footer.resources.timezone')}
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
                  {t('footer.resources.rfc')}
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-xs">
              {t('footer.copyright')}
            </p>
            <div className="flex items-center gap-4 text-xs">
              <span>{t('footer.made')}</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
