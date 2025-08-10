import { ChevronDown, ChevronUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  keywords?: string[];
}

const faqData: FAQItem[] = [
  {
    id: 'timestamp-to-milliseconds',
    question: '时间戳到毫秒如何转换？timestamp to milliseconds conversion',
    answer:
      'Unix时间戳通常以秒为单位，要转换为毫秒(timestamp to milliseconds)，只需将时间戳乘以1000。例如：1640995200 × 1000 = 1640995200000。JavaScript时间戳使用毫秒格式，而大多数后端系统使用秒时间戳。Python时间戳也可以通过time.time()*1000转换为毫秒。',
    keywords: ['毫秒', 'milliseconds', '转换', 'JavaScript时间戳', 'Python时间戳'],
  },
  {
    id: 'why-1970',
    question: '为什么从1970年开始？why 1970 unix timestamp',
    answer:
      '1970年1月1日00:00:00 UTC被称为"Unix纪元"（Unix Epoch）。这个日期是在Unix操作系统开发时选择的，作为时间计算的起点。选择1970年是因为它是一个相对较近的过去日期，能够覆盖计算机时代的大部分时间，同时避免了更早期可能出现的日期计算问题。why 1970 unix timestamp这个问题的答案就是为了提供一个统一的时间参考点。',
    keywords: ['1970', 'Unix纪元', 'Epoch', '起点', 'why 1970 unix timestamp'],
  },
  {
    id: 'leap-seconds',
    question: '如何处理闰秒？',
    answer:
      'Unix时间戳不包含闰秒。当发生闰秒时，Unix时间戳会"重复"一秒或"跳过"一秒。大多数系统通过NTP（网络时间协议）来处理闰秒调整。在实际应用中，闰秒对日常时间戳转换的影响很小，但在需要极高精度的科学计算中需要特别考虑。',
    keywords: ['闰秒', 'leap second', 'NTP', '精度'],
  },
  {
    id: 'timezone-handling',
    question: '时间戳如何处理时区？',
    answer:
      'Unix时间戳本身是UTC时间，不包含时区信息。它表示的是从1970年1月1日00:00:00 UTC开始的秒数。当显示给用户时，需要根据用户的时区进行转换。这就是为什么同一个时间戳在不同时区会显示不同的本地时间。',
    keywords: ['时区', 'timezone', 'UTC', '本地时间'],
  },
  {
    id: 'negative-timestamps',
    question: '负数时间戳代表什么？',
    answer:
      '负数时间戳表示1970年1月1日之前的时间。例如，-86400表示1969年12月31日00:00:00 UTC。虽然不常见，但在处理历史数据时可能会遇到负数时间戳。',
    keywords: ['负数', 'negative', '历史', '1969'],
  },
  {
    id: 'max-timestamp',
    question: '时间戳的最大值是多少？',
    answer:
      '32位系统的最大时间戳是2147483647，对应2038年1月19日03:14:07 UTC，这被称为"2038年问题"。64位系统可以支持更大的时间戳值，理论上可以表示数十亿年的时间范围。现代系统大多已迁移到64位时间戳。',
    keywords: ['最大值', '2038', '64位', '32位'],
  },
  {
    id: 'precision-accuracy',
    question: '时间戳的精度和准确性如何？',
    answer:
      'Unix时间戳的精度取决于系统实现。标准Unix时间戳精确到秒，但许多系统支持毫秒（13位）或微秒（16位）精度。准确性取决于系统时钟的同步，通常通过NTP协议保持与标准时间的同步。',
    keywords: ['精度', 'precision', '准确性', 'accuracy'],
  },
  {
    id: 'programming-languages',
    question: '不同编程语言如何处理时间戳？',
    answer:
      'JavaScript使用毫秒时间戳（13位），Python的time.time()返回秒时间戳（可能包含小数），Java使用毫秒时间戳，C/C++通常使用秒时间戳。在跨语言开发时，需要注意时间戳的单位差异。',
    keywords: ['编程语言', 'JavaScript', 'Python', 'Java'],
  },
  {
    id: 'convert-timestamp-online',
    question: '如何在线转换时间戳？convert timestamp online',
    answer:
      '使用在线转换时间戳工具(convert timestamp online)是最简单的方法。只需输入Unix时间戳或日期时间，工具会自动识别格式并进行转换。支持秒级和毫秒级时间戳，以及各种日期格式的相互转换。这种在线转换工具特别适合开发者快速验证时间戳格式。',
    keywords: ['在线转换时间戳', 'convert timestamp online', '工具', 'tool'],
  },
  {
    id: 'timestamp-format-types',
    question: '时间戳有哪些常见格式？',
    answer:
      '常见的时间戳格式包括：Unix时间戳（10位秒级）、JavaScript时间戳（13位毫秒级）、ISO 8601格式（如2023-01-01T00:00:00Z）、RFC 2822格式等。不同系统和应用可能使用不同的格式。',
    keywords: ['格式', 'format', 'ISO 8601', 'RFC 2822'],
  },
  {
    id: 'database-timestamp-storage',
    question: '数据库时间戳存储最佳实践？database timestamp storage',
    answer:
      '数据库时间戳存储(database timestamp storage)有多种方式：MySQL的TIMESTAMP、PostgreSQL的TIMESTAMPTZ等专门类型，或使用整数存储Unix时间戳。选择存储方式时需要考虑时区处理、查询性能和数据精度等因素。推荐使用UTC时间戳避免时区问题。',
    keywords: ['数据库时间戳存储', 'database timestamp storage', 'MySQL', 'PostgreSQL', '存储'],
  },
  {
    id: 'unix-timestamp-format',
    question: 'Unix时间戳格式有哪些类型？',
    answer:
      'Unix时间戳格式主要包括：10位秒级时间戳(如1640995200)、13位毫秒级时间戳(如1640995200000)、16位微秒级时间戳。不同的Unix时间戳格式适用于不同的精度需求，开发时需要注意格式转换。',
    keywords: ['Unix时间戳格式', 'timestamp format types', '10位', '13位', '格式转换'],
  },
];

export default function FAQ() {
  const { isDark } = useTheme();
  const { t } = useLanguage();
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());

  // 添加结构化数据用于SEO
  useEffect(() => {
    const structuredData = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqData.map(item => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.answer,
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
  }, []);

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
      <h2 className='text-2xl sm:text-3xl font-bold mb-6 text-center'>常见问题 FAQ</h2>
      <p className={`text-center mb-8 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
        关于时间戳转换的常见问题解答
      </p>

      <div className='space-y-4'>
        {faqData.map(item => {
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
                <h3 className='font-medium text-lg pr-4'>{item.question}</h3>
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
                    <p className='leading-relaxed'>{item.answer}</p>
                    {item.keywords && (
                      <div className='mt-3 flex flex-wrap gap-2'>
                        {item.keywords.map((keyword, index) => (
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
          💡 <strong>提示：</strong>
          这些FAQ涵盖了时间戳转换的核心概念，帮助您更好地理解和使用Unix时间戳。
          如果您有其他问题，欢迎查看我们的
          <a href='/guide' className='text-blue-600 dark:text-blue-400 hover:underline ml-1'>
            开发者指南
          </a>
          。
        </p>
      </div>
    </section>
  );
}
