import { ChevronDown, ChevronUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { additionalFaqData, faqData } from '../data/faqData';

// 合并所有FAQ数据
const allFaqData = [...faqData, ...additionalFaqData];

export default function FAQ() {
  const { isDark } = useTheme();
  const { t, language } = useLanguage();
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());
  // 添加结构化数据用于SEO
  useEffect(() => {
    const structuredData = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: allFaqData.map(item => ({
        '@type': 'Question',
        name: item.question[language],
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.answer[language],
        },
      })),
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify(structuredData);
    script.id = 'faq-structured-data';

    // 移除已存在的结构化数据
    const existingScript = document.getElementById('faq-structured-data');
    if (existingScript) {
      existingScript.remove();
    }

    document.head.appendChild(script);

    return () => {
      const scriptToRemove = document.getElementById('faq-structured-data');
      if (scriptToRemove) {
        scriptToRemove.remove();
      }
    };
  }, [language]);

  const toggleItem = (id: string) => {
    const newOpenItems = new Set(openItems);
    if (newOpenItems.has(id)) {
      newOpenItems.delete(id);
    } else {
      newOpenItems.add(id);
    }
    setOpenItems(newOpenItems);
  };

  return (
    <section className='mb-8'>
      <h2 className='text-2xl sm:text-3xl font-bold mb-6 text-center'>{t('faq.title')}</h2>
      <p className={`text-center mb-8 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
        {t('faq.subtitle')}
      </p>

      <div className='space-y-4'>
        {allFaqData.map(item => {
          const isOpen = openItems.has(item.id);

          return (
            <div
              key={item.id}
              className={`border rounded-lg transition-all duration-200 ${
                isDark ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-white'
              } ${isOpen ? 'shadow-md' : 'hover:shadow-sm'}`}
            >
              <button
                onClick={() => toggleItem(item.id)}
                className={`w-full px-6 py-4 text-left flex items-center justify-between transition-colors duration-200 ${
                  isDark ? 'hover:bg-slate-700/50' : 'hover:bg-slate-50'
                }`}
                aria-expanded={isOpen}
                aria-controls={`faq-answer-${item.id}`}
              >
                <h3 className='font-medium text-lg pr-4'>{item.question[language]}</h3>
                <div className='flex-shrink-0'>
                  {isOpen ? (
                    <ChevronUp className='w-5 h-5 text-blue-600 dark:text-blue-400' />
                  ) : (
                    <ChevronDown className='w-5 h-5 text-slate-400' />
                  )}
                </div>
              </button>

              {isOpen && (
                <div
                  id={`faq-answer-${item.id}`}
                  className={`px-6 pb-4 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}
                >
                  <div className='pt-2 border-t border-slate-200 dark:border-slate-600'>
                    <p className='leading-relaxed'>{item.answer[language]}</p>
                    {item.keywords && (
                      <div className='mt-3 flex flex-wrap gap-2'>
                        {item.keywords[language].map((keyword, index) => (
                          <span
                            key={index}
                            className={`px-2 py-1 text-xs rounded-full ${
                              isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {keyword}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* SEO优化的结构化数据提示 */}
      <div className={`mt-8 p-4 rounded-lg ${isDark ? 'bg-slate-800/30' : 'bg-blue-50'}`}>
        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
          <span dangerouslySetInnerHTML={{ __html: t('faq.tip') }} />
          <a href='/guide' className='text-blue-600 dark:text-blue-400 hover:underline ml-1'>
            {t('faq.guide.link')}
          </a>
          。
        </p>
      </div>
    </section>
  );
}
