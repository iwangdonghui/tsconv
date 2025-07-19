import React, { createContext, useContext, useState, useEffect } from 'react';

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
    'unix.what.description': 'A Unix timestamp is the number of seconds that have elapsed since January 1, 1970, 00:00:00 UTC. It\'s a simple way to represent time that\'s widely used in programming and databases.',
    
    // Footer
    'footer.brand.title': 'tsconv.com',
    'footer.brand.description': 'The fastest and most reliable timestamp conversion tool for developers worldwide.',
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
    'unix.what.description': 'Unix 时间戳是自 1970 年 1 月 1 日 00:00:00 UTC 以来经过的秒数。这是一种在编程和数据库中广泛使用的简单时间表示方法。',
    
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
  }
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
    return translations[language][key] || key;
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
