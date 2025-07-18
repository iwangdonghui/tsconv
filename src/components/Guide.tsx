
import { useState } from 'react';
import { Clock, Code, Globe, Calendar } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
// import Header from './Header';

// 导入指南组件
import WhatIsUnixTimestamp from './guides/WhatIsUnixTimestamp';
import JavaScriptTimestamps from './guides/JavaScriptTimestamps';
import PythonDatetime from './guides/PythonDatetime';
import TimezonesGuide from './guides/TimezonesGuide';

export default function Guide() {
  const [selectedArticle, setSelectedArticle] = useState<string | null>(null);
  const { isDark } = useTheme();

  const articles = [
    {
      id: 'what-is-unix-timestamp',
      title: 'What is a Unix Timestamp?',
      description: 'Understanding the fundamentals of Unix time and why it matters',
      icon: <Clock className="w-5 h-5 sm:w-6 sm:h-6" />,
      content: <WhatIsUnixTimestamp />
    },
    {
      id: 'javascript-timestamps',
      title: 'JavaScript Timestamp Handling',
      description: 'Common pitfalls and best practices for JavaScript developers',
      icon: <Code className="w-5 h-5 sm:w-6 sm:h-6" />,
      content: <JavaScriptTimestamps />
    },
    {
      id: 'python-datetime',
      title: 'Python Datetime vs Timestamps',
      description: 'When to use datetime objects vs Unix timestamps in Python',
      icon: <Code className="w-5 h-5 sm:w-6 sm:h-6" />,
      content: <PythonDatetime />
    },
    {
      id: 'timezones-guide',
      title: 'Timezone Handling Guide',
      description: 'Master timezone management in global applications',
      icon: <Globe className="w-5 h-5 sm:w-6 sm:h-6" />,
      content: <TimezonesGuide />
    }
  ];

  if (selectedArticle) {
    const article = articles.find(a => a.id === selectedArticle);
    return (
      <div className={`min-h-screen transition-colors duration-200 ${
        isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'
      }`}>
        {/* <Header currentPage="guide" /> */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <button
            onClick={() => setSelectedArticle(null)}
            className="mb-4 sm:mb-6 text-blue-600 dark:text-blue-400 hover:underline text-sm sm:text-base"
          >
            ← Back to Guides
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold mb-4">{article?.title}</h1>
          <div className="prose prose-slate dark:prose-invert max-w-none">
            {article?.content}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-200 ${
      isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'
    }`}>
      {/* <Header currentPage="guide" /> */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <h1 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4">Developer Guides</h1>
        <p className="text-base sm:text-lg mb-6 sm:mb-8 text-slate-600 dark:text-slate-400">
          Comprehensive guides for working with timestamps in different programming languages and scenarios.
        </p>

        <div className="grid gap-4 sm:gap-6 sm:grid-cols-2">
          {articles.map((article) => (
            <div
              key={article.id}
              onClick={() => setSelectedArticle(article.id)}
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
    </div>
  );
}
