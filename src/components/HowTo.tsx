import { Clock, Code, Calculator, Globe, Database, Zap } from "lucide-react";
import { useParams, useNavigate } from 'react-router-dom';

import { useTheme } from '../contexts/ThemeContext';
import { SEO } from './SEO';
import Header from './Header';
import Footer from './Footer';

// 导入 How To 组件
import GetCurrentTimestamp from './howto/GetCurrentTimestamp';
import TimeArithmetic from './howto/TimeArithmetic';
import FormatTimestamps from './howto/FormatTimestamps';
import TimezoneConversion from './howto/TimezoneConversion';
import DatabaseOperations from './howto/DatabaseOperations';
import CommonPatterns from './howto/CommonPatterns';

export default function HowTo() {
  const { articleId } = useParams();
  const navigate = useNavigate();
  const { isDark } = useTheme();

  const articles = [
    {
      id: 'get-current-timestamp',
      title: 'Get Current Timestamp',
      description: 'Get Unix timestamps in 9 programming languages: JavaScript, Python, Java, PHP, Go, C#, Ruby, Rust & Swift',
      icon: <Clock className="w-5 h-5 sm:w-6 sm:h-6" />,
      content: <GetCurrentTimestamp />
    },
    {
      id: 'time-arithmetic',
      title: 'Time Arithmetic',
      description: 'Add, subtract, and calculate time differences across languages',
      icon: <Calculator className="w-5 h-5 sm:w-6 sm:h-6" />,
      content: <TimeArithmetic />
    },
    {
      id: 'format-timestamps',
      title: 'Format Timestamps',
      description: 'Convert timestamps to human-readable formats and custom patterns',
      icon: <Code className="w-5 h-5 sm:w-6 sm:h-6" />,
      content: <FormatTimestamps />
    },
    {
      id: 'timezone-conversion',
      title: 'Timezone Conversion',
      description: 'Convert timestamps between different timezones programmatically',
      icon: <Globe className="w-5 h-5 sm:w-6 sm:h-6" />,
      content: <TimezoneConversion />
    },
    {
      id: 'database-operations',
      title: 'Database Operations',
      description: 'Store, query, and manipulate timestamps in various databases',
      icon: <Database className="w-5 h-5 sm:w-6 sm:h-6" />,
      content: <DatabaseOperations />
    },
    {
      id: 'common-patterns',
      title: 'Common Patterns',
      description: 'Frequently used timestamp patterns and best practices',
      icon: <Zap className="w-5 h-5 sm:w-6 sm:h-6" />,
      content: <CommonPatterns />
    }
  ];

  // 如果有 articleId，显示具体文章
  if (articleId) {
    const article = articles.find(a => a.id === articleId);
    
    if (!article) {
      navigate('/how-to');
      return null;
    }

    return (
      <div className={`min-h-screen transition-colors duration-200 ${
        isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'
      }`}>
        <SEO
          title={`${article.title} - How To | tsconv.com`}
          description={article.description}
          canonical={`https://www.tsconv.com/how-to/${articleId}`}
          ogTitle={`${article.title} - How To`}
          ogDescription={article.description}
          keywords={`timestamp how to, ${article.title.toLowerCase()}, unix timestamp tutorial, date conversion`}
        />
        <Header />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <button
            onClick={() => navigate('/how-to')}
            className="mb-4 sm:mb-6 text-blue-600 dark:text-blue-400 hover:underline text-sm sm:text-base"
          >
            ← Back to How To
          </button>
          <div className="prose prose-slate dark:prose-invert max-w-none">
            {article.content}
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // 显示 How To 列表
  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-200 ${
      isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'
    }`}>
      <SEO
        title="How To Guides - Timestamp Converter | tsconv.com"
        description="Quick reference guides for common timestamp operations across different programming languages. Learn how to work with timestamps effectively."
        canonical="https://www.tsconv.com/how-to"
        ogTitle="How To Guides - Timestamp Converter"
        ogDescription="Quick reference guides for common timestamp operations across different programming languages. Learn how to work with timestamps effectively."
        keywords="timestamp how to, unix timestamp tutorial, date conversion tutorial, programming timestamps"
      />
      <Header />
      <div className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <h1 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4">How To</h1>
        <p className="text-base sm:text-lg mb-6 sm:mb-8 text-slate-600 dark:text-slate-400">
          Quick reference guides for common timestamp operations across different programming languages.
        </p>

        <div className="grid gap-4 sm:gap-6 sm:grid-cols-2">
          {articles.map((article) => (
            <div
              key={article.id}
              onClick={() => navigate(`/how-to/${article.id}`)}
              className={`p-4 sm:p-6 rounded-lg border cursor-pointer transition-all hover:shadow-lg ${
                isDark 
                  ? 'bg-slate-800 border-slate-700 hover:border-slate-600' 
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-1">
                  {article.icon}
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg sm:text-xl font-semibold mb-2 leading-tight">{article.title}</h3>
                  <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
                    {article.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <Footer />
    </div>
  );
}
