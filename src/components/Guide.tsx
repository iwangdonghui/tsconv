import { Clock, Code, Database, Globe, Server } from 'lucide-react';
// import { useState } from 'react'; // Not used in this component
import { useNavigate, useParams } from 'react-router-dom';

import { useTheme } from '../contexts/ThemeContext';
import Footer from './Footer';
import Header from './Header';
import { SEO } from './SEO';

// 导入指南组件
import APITimestampHandling from './guides/APITimestampHandling';
import DatabaseTimestamps from './guides/DatabaseTimestamps';
import JavaScriptTimestamps from './guides/JavaScriptTimestamps';
import PythonDatetime from './guides/PythonDatetime';
import TimezonesGuide from './guides/TimezonesGuide';
import WhatIsUnixTimestamp from './guides/WhatIsUnixTimestamp';

export default function Guide() {
  const { articleId } = useParams();
  const navigate = useNavigate();
  const { isDark } = useTheme();

  const articles = [
    {
      id: 'what-is-unix-timestamp',
      title: 'What is a Unix Timestamp?',
      description: 'Understanding the fundamentals of Unix time and why it matters',
      icon: <Clock className='w-5 h-5 sm:w-6 sm:h-6' />,
      content: <WhatIsUnixTimestamp />,
    },
    {
      id: 'javascript-timestamps',
      title: 'JavaScript Timestamp Handling',
      description: 'Common pitfalls and best practices for JavaScript developers',
      icon: <Code className='w-5 h-5 sm:w-6 sm:h-6' />,
      content: <JavaScriptTimestamps />,
    },
    {
      id: 'python-datetime',
      title: 'Python Datetime vs Timestamps',
      description: 'When to use datetime objects vs Unix timestamps in Python',
      icon: <Code className='w-5 h-5 sm:w-6 sm:h-6' />,
      content: <PythonDatetime />,
    },
    {
      id: 'timezones-guide',
      title: 'Timezone Handling Guide',
      description: 'Master timezone management in global applications',
      icon: <Globe className='w-5 h-5 sm:w-6 sm:h-6' />,
      content: <TimezonesGuide />,
    },
    {
      id: 'database-timestamps',
      title: 'Database Timestamp Best Practices',
      description: 'Optimize timestamp storage and queries across different databases',
      icon: <Database className='w-5 h-5 sm:w-6 sm:h-6' />,
      content: <DatabaseTimestamps />,
    },
    {
      id: 'api-timestamp-handling',
      title: 'API Timestamp Design Patterns',
      description: 'RESTful and GraphQL timestamp handling best practices',
      icon: <Server className='w-5 h-5 sm:w-6 sm:h-6' />,
      content: <APITimestampHandling />,
    },
  ];

  // 如果有 articleId，显示具体文章
  if (articleId) {
    const article = articles.find(a => a.id === articleId);

    if (!article) {
      // 文章不存在，重定向到指南列表
      navigate('/guide');
      return null;
    }

    return (
      <div
        className={`min-h-screen transition-colors duration-200 ${
          isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'
        }`}
      >
        <SEO
          title={`${article.title} - Guide | tsconv.com`}
          description={article.description}
          canonical={`https://www.tsconv.com/guide/${articleId}`}
          ogTitle={`${article.title} - Guide`}
          ogDescription={article.description}
          keywords={`timestamp guide, ${article.title.toLowerCase()}, unix timestamp, date conversion`}
        />
        <Header />
        <div className='max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8'>
          <button
            onClick={() => navigate('/guide')}
            className='mb-4 sm:mb-6 text-blue-600 dark:text-blue-400 hover:underline text-sm sm:text-base'
          >
            ← Back to Guides
          </button>
          <div className='prose prose-slate dark:prose-invert max-w-none'>{article.content}</div>
        </div>
        <Footer />
      </div>
    );
  }

  // 显示指南列表
  return (
    <div
      className={`min-h-screen flex flex-col transition-colors duration-200 ${
        isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'
      }`}
    >
      <SEO
        title='Developer Guides - Timestamp Converter | tsconv.com'
        description='Comprehensive guides for working with timestamps in different programming languages and frameworks. Learn best practices for timestamp handling.'
        canonical='https://www.tsconv.com/guide'
        ogTitle='Developer Guides - Timestamp Converter'
        ogDescription='Comprehensive guides for working with timestamps in different programming languages and frameworks. Learn best practices for timestamp handling.'
        keywords='timestamp guides, unix timestamp tutorial, date conversion guide, programming timestamps'
      />
      <Header />
      <div className='flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12'>
        <h1 className='text-2xl sm:text-3xl font-bold mb-3 sm:mb-4'>Developer Guides</h1>
        <p className='text-base sm:text-lg mb-6 sm:mb-8 text-slate-600 dark:text-slate-400'>
          Comprehensive guides for working with timestamps in different programming languages and
          scenarios.
        </p>

        <div className='grid gap-4 sm:gap-6 sm:grid-cols-2'>
          {articles.map(article => (
            <div
              key={article.id}
              onClick={() => navigate(`/guide/${article.id}`)}
              className={`p-4 sm:p-6 rounded-lg border cursor-pointer transition-all hover:shadow-lg ${
                isDark
                  ? 'bg-slate-800 border-slate-700 hover:border-slate-600'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className='flex items-start gap-3 sm:gap-4'>
                <div className='text-blue-600 dark:text-blue-400 flex-shrink-0 mt-1'>
                  {article.icon}
                </div>
                <div className='min-w-0'>
                  <h2 className='text-lg sm:text-xl font-semibold mb-2 leading-tight'>
                    {article.title}
                  </h2>
                  <p className='text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed'>
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
