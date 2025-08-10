import React, { createContext, useContext, useEffect, useState } from 'react';

type Language = 'en' | 'zh';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations = {
  en: {
    // Header
    'nav.converter': 'Timestamp Converter',
    'nav.api': 'API Docs',
    'nav.guide': 'Guide',
    'nav.howto': 'How To',

    // Header accessibility
    'header.language.toggle': 'Change language',
    'header.language.english': 'Switch to English',
    'header.language.chinese': 'Switch to Chinese',
    'header.theme.light': 'Switch to light mode',
    'header.theme.dark': 'Switch to dark mode',
    'header.menu.open': 'Open navigation menu',
    'header.menu.close': 'Close navigation menu',
    'header.menu.navigation': 'Main navigation',

    // Current Timestamp
    'current.title': '🕐 Current Unix Timestamp',
    'current.updates': 'Updates every second',
    'current.paused': 'Paused',
    'current.pause': 'Pause',
    'current.resume': 'Resume',

    // Manual Date
    'manual.title': 'Manual Date & Time',
    'manual.year': 'Year',
    'manual.month': 'Month',
    'manual.day': 'Day',
    'manual.hour': 'Hour',
    'manual.minute': 'Minute',
    'manual.second': 'Second',
    'manual.timestamp': 'Timestamp',

    // Batch Converter
    'batch.title': 'Batch Converter',
    'batch.description': 'Enter multiple timestamps or dates (one per line) for batch conversion:',
    'batch.results': 'Results:',
    'batch.copy': 'Copy Results',
    'batch.copied': 'Copied!',

    // Main Converter
    'converter.title': 'Timestamp Converter',
    'converter.subtitle': 'Convert Unix timestamps to human-readable dates and vice versa',
    'converter.placeholder': 'Enter timestamp or date...',
    'converter.clear': 'Clear',
    'converter.copy': 'Copy',
    'converter.copied': 'Copied!',

    // Results
    'result.unix': 'Unix Timestamp',
    'result.utc': 'UTC Time',
    'result.local': 'Local Time',
    'result.iso': 'ISO 8601',
    'result.relative': 'Relative Time',
    'result.timezone': 'Your Timezone',

    // What is Unix Timestamp section
    'unix.what.title': 'What is a Unix Timestamp?',
    'unix.what.description':
      "A Unix timestamp is the number of seconds that have elapsed since January 1, 1970, 00:00:00 UTC. It's a simple way to represent time that's widely used in programming and databases.",

    // Validation and Error Messages
    'validation.suggestions': 'Suggestions:',
    'validation.state.idle': 'Ready for input',
    'validation.state.validating': 'Validating input',
    'validation.state.valid': 'Input is valid',
    'validation.state.invalid': 'Input is invalid',
    'validation.state.warning': 'Input has warnings',
    'validation.apply.suggestion': 'Apply suggestion: {suggestion}',
    'validation.copy.suggestion': 'Copy suggestion: {suggestion}',

    // Error Messages
    'error.timestamp.invalid': 'Invalid timestamp format',
    'error.timestamp.range': 'Timestamp must be between {min} and {max}',
    'error.timestamp.length': 'Timestamp must be 9, 10, or 13 digits',
    'error.date.invalid': 'Invalid date format',
    'error.date.range': 'Date must be between {min} and {max}',
    'error.date.malformed': 'Date format is not recognized',
    'error.date.components': 'Invalid date components',
    'error.manual.date.invalid': 'Invalid manual date configuration',
    'error.manual.date.range': 'Year must be 1970 or later for Unix timestamps',
    'error.batch.limit': 'Batch processing limited to 100 items per request',
    'error.clipboard.failed': 'Failed to copy to clipboard',
    'error.clipboard.permission': 'Clipboard access denied. Please check browser permissions.',
    'error.unknown': 'An unexpected error occurred. Please try again.',

    // Suggestions
    'suggestion.timestamp.add_zeros': 'Try adding leading zeros to make a 10-digit timestamp',
    'suggestion.timestamp.remove_milliseconds': 'Divide by 1000 to convert milliseconds to seconds',
    'suggestion.date.iso_format': 'Try YYYY-MM-DD or YYYY-MM-DD HH:MM:SS format',
    'suggestion.date.remove_timezone': 'Remove timezone offset from date string',
    'suggestion.manual.check_date': 'Verify the date exists (e.g., check for leap years)',
    'suggestion.manual.check_range': 'Ensure all values are within valid ranges',

    // FAQ
    'faq.title': 'Frequently Asked Questions',
    'faq.subtitle': 'Common questions about timestamp conversion',
    'faq.tip':
      '💡 <strong>Tip:</strong> These FAQs cover the core concepts of timestamp conversion to help you better understand and use Unix timestamps. If you have other questions, please check our',
    'faq.guide.link': 'Developer Guide',

    // Footer
    'footer.brand.title': 'tsconv.com',
    'footer.brand.description':
      'The fastest and most reliable timestamp conversion tool for developers worldwide.',
    'footer.links.title': 'Quick Links',
    'footer.links.converter': 'Timestamp Converter',
    'footer.links.api': 'API Documentation',
    'footer.links.guide': 'Developer Guides',
    'footer.resources.title': 'Resources',
    'footer.resources.unix': 'About Unix Time',
    'footer.resources.timezone': 'IANA Time Zones',
    'footer.resources.rfc': 'RFC 3339 Standard',
    'footer.copyright': '© 2025 tsconv.com. Built for developers, by developers.',
    'footer.made': 'Made with ❤️ for the developer community',
  },
  zh: {
    // Header
    'nav.converter': '时间戳转换器',
    'nav.api': 'API 文档',
    'nav.guide': '指南',
    'nav.howto': '使用教程',

    // Header accessibility
    'header.language.toggle': '切换语言',
    'header.language.english': '切换到英文',
    'header.language.chinese': '切换到中文',
    'header.theme.light': '切换到浅色模式',
    'header.theme.dark': '切换到深色模式',
    'header.menu.open': '打开导航菜单',
    'header.menu.close': '关闭导航菜单',
    'header.menu.navigation': '主导航',

    // Current Timestamp
    'current.title': '🕐 当前 Unix 时间戳',
    'current.updates': '每秒更新',
    'current.paused': '已暂停',
    'current.pause': '暂停',
    'current.resume': '继续',

    // Manual Date
    'manual.title': '手动设置日期时间',
    'manual.year': '年',
    'manual.month': '月',
    'manual.day': '日',
    'manual.hour': '时',
    'manual.minute': '分',
    'manual.second': '秒',
    'manual.timestamp': '时间戳',

    // Batch Converter
    'batch.title': '批量转换',
    'batch.description': '输入多个时间戳或日期（每行一个）进行批量转换：',
    'batch.results': '转换结果：',
    'batch.copy': '复制结果',
    'batch.copied': '已复制！',

    // Main Converter
    'converter.title': '时间戳转换器',
    'converter.subtitle': '在 Unix 时间戳和人类可读日期之间进行转换',
    'converter.placeholder': '输入时间戳或日期...',
    'converter.clear': '清除',
    'converter.copy': '复制',
    'converter.copied': '已复制！',

    // Results
    'result.unix': 'Unix 时间戳',
    'result.utc': 'UTC 时间',
    'result.local': '本地时间',
    'result.iso': 'ISO 8601',
    'result.relative': '相对时间',
    'result.timezone': '您的时区',

    // What is Unix Timestamp section
    'unix.what.title': '什么是 Unix 时间戳？',
    'unix.what.description':
      'Unix 时间戳是自 1970 年 1 月 1 日 00:00:00 UTC 以来经过的秒数。这是一种在编程和数据库中广泛使用的简单时间表示方法。',

    // Validation and Error Messages
    'validation.suggestions': '建议：',
    'validation.state.idle': '等待输入',
    'validation.state.validating': '正在验证输入',
    'validation.state.valid': '输入有效',
    'validation.state.invalid': '输入无效',
    'validation.state.warning': '输入有警告',
    'validation.apply.suggestion': '应用建议：{suggestion}',
    'validation.copy.suggestion': '复制建议：{suggestion}',

    // Error Messages
    'error.timestamp.invalid': '无效的时间戳格式',
    'error.timestamp.range': '时间戳必须在 {min} 和 {max} 之间',
    'error.timestamp.length': '时间戳必须是9位、10位或13位数字',
    'error.date.invalid': '无效的日期格式',
    'error.date.range': '日期必须在 {min} 和 {max} 之间',
    'error.date.malformed': '无法识别的日期格式',
    'error.date.components': '无效的日期组件',
    'error.manual.date.invalid': '无效的手动日期配置',
    'error.manual.date.range': 'Unix时间戳的年份必须是1970年或之后',
    'error.batch.limit': '批量处理限制为每次100个项目',
    'error.clipboard.failed': '复制到剪贴板失败',
    'error.clipboard.permission': '剪贴板访问被拒绝。请检查浏览器权限。',
    'error.unknown': '发生意外错误。请重试。',

    // Suggestions
    'suggestion.timestamp.add_zeros': '尝试添加前导零使其成为10位时间戳',
    'suggestion.timestamp.remove_milliseconds': '除以1000将毫秒转换为秒',
    'suggestion.date.iso_format': '尝试YYYY-MM-DD或YYYY-MM-DD HH:MM:SS格式',
    'suggestion.date.remove_timezone': '从日期字符串中移除时区偏移',
    'suggestion.manual.check_date': '验证日期是否存在（例如检查闰年）',
    'suggestion.manual.check_range': '确保所有值都在有效范围内',

    // FAQ
    'faq.title': '常见问题 FAQ',
    'faq.subtitle': '关于时间戳转换的常见问题解答',
    'faq.tip':
      '💡 <strong>提示：</strong>这些FAQ涵盖了时间戳转换的核心概念，帮助您更好地理解和使用Unix时间戳。如果您有其他问题，欢迎查看我们的',
    'faq.guide.link': '开发者指南',

    // Footer
    'footer.brand.title': 'tsconv.com',
    'footer.brand.description': '为全球开发者提供最快速、最可靠的时间戳转换工具。',
    'footer.links.title': '快速链接',
    'footer.links.converter': '时间戳转换器',
    'footer.links.api': 'API 文档',
    'footer.links.guide': '开发者指南',
    'footer.resources.title': '资源',
    'footer.resources.unix': '关于 Unix 时间',
    'footer.resources.timezone': 'IANA 时区',
    'footer.resources.rfc': 'RFC 3339 标准',
    'footer.copyright': '© 2025 tsconv.com. 为开发者而生，由开发者打造。',
    'footer.made': '用 ❤️ 为开发者社区制作',
  },
};

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');

  useEffect(() => {
    const saved = localStorage.getItem('language') as Language;
    if (saved && (saved === 'en' || saved === 'zh')) {
      setLanguage(saved);
    }
  }, []);

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('language', lang);
  };

  const t = (key: string): string => {
    return (translations[language] as Record<string, string>)[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
