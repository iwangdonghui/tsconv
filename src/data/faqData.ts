export interface FAQItem {
  id: string;
  question: {
    en: string;
    zh: string;
  };
  answer: {
    en: string;
    zh: string;
  };
  keywords: {
    en: string[];
    zh: string[];
  };
}

export const faqData: FAQItem[] = [
  {
    id: 'timestamp-to-milliseconds',
    question: {
      en: 'How to convert timestamp to milliseconds?',
      zh: '时间戳到毫秒如何转换？timestamp to milliseconds conversion'
    },
    answer: {
      en: 'Unix timestamps are usually in seconds. To convert timestamp to milliseconds, simply multiply by 1000. For example: 1640995200 × 1000 = 1640995200000. JavaScript timestamps use millisecond format, while most backend systems use second timestamps. Python timestamps can also be converted to milliseconds using time.time()*1000.',
      zh: 'Unix时间戳通常以秒为单位，要转换为毫秒(timestamp to milliseconds)，只需将时间戳乘以1000。例如：1640995200 × 1000 = 1640995200000。JavaScript时间戳使用毫秒格式，而大多数后端系统使用秒时间戳。Python时间戳也可以通过time.time()*1000转换为毫秒。'
    },
    keywords: {
      en: ['milliseconds', 'conversion', 'JavaScript timestamp', 'Python timestamp'],
      zh: ['毫秒', 'milliseconds', '转换', 'JavaScript时间戳', 'Python时间戳']
    }
  },
  {
    id: 'why-1970',
    question: {
      en: 'Why does Unix timestamp start from 1970?',
      zh: '为什么从1970年开始？why 1970 unix timestamp'
    },
    answer: {
      en: 'January 1, 1970, 00:00:00 UTC is called the "Unix Epoch". This date was chosen during Unix operating system development as the starting point for time calculations. 1970 was selected because it was a relatively recent past date that could cover most of the computer era while avoiding potential date calculation issues from earlier periods. The answer to "why 1970 unix timestamp" is to provide a unified time reference point.',
      zh: '1970年1月1日00:00:00 UTC被称为"Unix纪元"（Unix Epoch）。这个日期是在Unix操作系统开发时选择的，作为时间计算的起点。选择1970年是因为它是一个相对较近的过去日期，能够覆盖计算机时代的大部分时间，同时避免了更早期可能出现的日期计算问题。why 1970 unix timestamp这个问题的答案就是为了提供一个统一的时间参考点。'
    },
    keywords: {
      en: ['1970', 'Unix Epoch', 'Epoch', 'starting point', 'why 1970 unix timestamp'],
      zh: ['1970', 'Unix纪元', 'Epoch', '起点', 'why 1970 unix timestamp']
    }
  },
  {
    id: 'leap-seconds',
    question: {
      en: 'How to handle leap seconds?',
      zh: '如何处理闰秒？'
    },
    answer: {
      en: 'Unix timestamps do not include leap seconds. When a leap second occurs, Unix timestamps will "repeat" or "skip" a second. Most systems handle leap second adjustments through NTP (Network Time Protocol). In practical applications, leap seconds have minimal impact on daily timestamp conversion, but need special consideration in scientific calculations requiring extreme precision.',
      zh: 'Unix时间戳不包含闰秒。当发生闰秒时，Unix时间戳会"重复"一秒或"跳过"一秒。大多数系统通过NTP（网络时间协议）来处理闰秒调整。在实际应用中，闰秒对日常时间戳转换的影响很小，但在需要极高精度的科学计算中需要特别考虑。'
    },
    keywords: {
      en: ['leap second', 'NTP', 'precision'],
      zh: ['闰秒', 'leap second', 'NTP', '精度']
    }
  },
  {
    id: 'timezone-handling',
    question: {
      en: 'How do timestamps handle timezones?',
      zh: '时间戳如何处理时区？'
    },
    answer: {
      en: 'Unix timestamps are UTC time and do not contain timezone information. They represent the number of seconds since January 1, 1970, 00:00:00 UTC. When displaying to users, conversion based on the user\'s timezone is needed. This is why the same timestamp shows different local times in different timezones.',
      zh: 'Unix时间戳本身是UTC时间，不包含时区信息。它表示的是从1970年1月1日00:00:00 UTC开始的秒数。当显示给用户时，需要根据用户的时区进行转换。这就是为什么同一个时间戳在不同时区会显示不同的本地时间。'
    },
    keywords: {
      en: ['timezone', 'UTC', 'local time'],
      zh: ['时区', 'timezone', 'UTC', '本地时间']
    }
  },
  {
    id: 'negative-timestamps',
    question: {
      en: 'What do negative timestamps represent?',
      zh: '负数时间戳代表什么？'
    },
    answer: {
      en: 'Negative timestamps represent times before January 1, 1970. For example, -86400 represents December 31, 1969, 00:00:00 UTC. While uncommon, negative timestamps may be encountered when processing historical data.',
      zh: '负数时间戳表示1970年1月1日之前的时间。例如，-86400表示1969年12月31日00:00:00 UTC。虽然不常见，但在处理历史数据时可能会遇到负数时间戳。'
    },
    keywords: {
      en: ['negative', 'historical', '1969'],
      zh: ['负数', 'negative', '历史', '1969']
    }
  },
  {
    id: 'max-timestamp',
    question: {
      en: 'What is the maximum timestamp value?',
      zh: '时间戳的最大值是多少？'
    },
    answer: {
      en: 'The maximum timestamp for 32-bit systems is 2147483647, corresponding to January 19, 2038, 03:14:07 UTC, known as the "Year 2038 problem". 64-bit systems can support much larger timestamp values, theoretically representing billions of years. Most modern systems have migrated to 64-bit timestamps.',
      zh: '32位系统的最大时间戳是2147483647，对应2038年1月19日03:14:07 UTC，这被称为"2038年问题"。64位系统可以支持更大的时间戳值，理论上可以表示数十亿年的时间范围。现代系统大多已迁移到64位时间戳。'
    },
    keywords: {
      en: ['maximum value', '2038', '64-bit', '32-bit'],
      zh: ['最大值', '2038', '64位', '32位']
    }
  }
];

export const additionalFaqData: FAQItem[] = [
  {
    id: 'precision-accuracy',
    question: {
      en: 'What about timestamp precision and accuracy?',
      zh: '时间戳的精度和准确性如何？'
    },
    answer: {
      en: 'Unix timestamp precision depends on system implementation. Standard Unix timestamps are accurate to the second, but many systems support millisecond (13 digits) or microsecond (16 digits) precision. Accuracy depends on system clock synchronization, usually maintained through NTP protocol to stay synchronized with standard time.',
      zh: 'Unix时间戳的精度取决于系统实现。标准Unix时间戳精确到秒，但许多系统支持毫秒（13位）或微秒（16位）精度。准确性取决于系统时钟的同步，通常通过NTP协议保持与标准时间的同步。'
    },
    keywords: {
      en: ['precision', 'accuracy'],
      zh: ['精度', 'precision', '准确性', 'accuracy']
    }
  },
  {
    id: 'programming-languages',
    question: {
      en: 'How do different programming languages handle timestamps?',
      zh: '不同编程语言如何处理时间戳？'
    },
    answer: {
      en: 'JavaScript uses millisecond timestamps (13 digits), Python\'s time.time() returns second timestamps (may include decimals), Java uses millisecond timestamps, C/C++ typically use second timestamps. When developing across languages, attention must be paid to timestamp unit differences.',
      zh: 'JavaScript使用毫秒时间戳（13位），Python的time.time()返回秒时间戳（可能包含小数），Java使用毫秒时间戳，C/C++通常使用秒时间戳。在跨语言开发时，需要注意时间戳的单位差异。'
    },
    keywords: {
      en: ['programming languages', 'JavaScript', 'Python', 'Java'],
      zh: ['编程语言', 'JavaScript', 'Python', 'Java']
    }
  },
  {
    id: 'convert-timestamp-online',
    question: {
      en: 'How to convert timestamp online?',
      zh: '如何在线转换时间戳？convert timestamp online'
    },
    answer: {
      en: 'Using online timestamp conversion tools (convert timestamp online) is the simplest method. Just input Unix timestamps or date-time, and the tool will automatically recognize the format and perform conversion. Supports second-level and millisecond-level timestamps, as well as mutual conversion of various date formats. These online conversion tools are particularly suitable for developers to quickly verify timestamp formats.',
      zh: '使用在线转换时间戳工具(convert timestamp online)是最简单的方法。只需输入Unix时间戳或日期时间，工具会自动识别格式并进行转换。支持秒级和毫秒级时间戳，以及各种日期格式的相互转换。这种在线转换工具特别适合开发者快速验证时间戳格式。'
    },
    keywords: {
      en: ['online conversion', 'convert timestamp online', 'tool'],
      zh: ['在线转换时间戳', 'convert timestamp online', '工具', 'tool']
    }
  },
  {
    id: 'timestamp-format-types',
    question: {
      en: 'What are the common timestamp formats?',
      zh: '时间戳有哪些常见格式？'
    },
    answer: {
      en: 'Common timestamp formats include: Unix timestamp (10-digit second-level), JavaScript timestamp (13-digit millisecond-level), ISO 8601 format (like 2023-01-01T00:00:00Z), RFC 2822 format, etc. Different systems and applications may use different formats.',
      zh: '常见的时间戳格式包括：Unix时间戳（10位秒级）、JavaScript时间戳（13位毫秒级）、ISO 8601格式（如2023-01-01T00:00:00Z）、RFC 2822格式等。不同系统和应用可能使用不同的格式。'
    },
    keywords: {
      en: ['format', 'ISO 8601', 'RFC 2822'],
      zh: ['格式', 'format', 'ISO 8601', 'RFC 2822']
    }
  },
  {
    id: 'database-timestamp-storage',
    question: {
      en: 'Database timestamp storage best practices?',
      zh: '数据库时间戳存储最佳实践？database timestamp storage'
    },
    answer: {
      en: 'Database timestamp storage (database timestamp storage) has multiple approaches: specialized types like MySQL\'s TIMESTAMP, PostgreSQL\'s TIMESTAMPTZ, or using integer types to store Unix timestamps. When choosing storage methods, consider timezone handling, query performance, and data precision factors. Using UTC timestamps is recommended to avoid timezone issues.',
      zh: '数据库时间戳存储(database timestamp storage)有多种方式：MySQL的TIMESTAMP、PostgreSQL的TIMESTAMPTZ等专门类型，或使用整数存储Unix时间戳。选择存储方式时需要考虑时区处理、查询性能和数据精度等因素。推荐使用UTC时间戳避免时区问题。'
    },
    keywords: {
      en: ['database timestamp storage', 'MySQL', 'PostgreSQL', 'storage'],
      zh: ['数据库时间戳存储', 'database timestamp storage', 'MySQL', 'PostgreSQL', '存储']
    }
  },
  {
    id: 'unix-timestamp-format',
    question: {
      en: 'What types of Unix timestamp formats are there?',
      zh: 'Unix时间戳格式有哪些类型？'
    },
    answer: {
      en: 'Unix timestamp formats mainly include: 10-digit second-level timestamps (like 1640995200), 13-digit millisecond-level timestamps (like 1640995200000), 16-digit microsecond-level timestamps. Different Unix timestamp formats are suitable for different precision requirements, and format conversion needs attention during development.',
      zh: 'Unix时间戳格式主要包括：10位秒级时间戳(如1640995200)、13位毫秒级时间戳(如1640995200000)、16位微秒级时间戳。不同的Unix时间戳格式适用于不同的精度需求，开发时需要注意格式转换。'
    },
    keywords: {
      en: ['Unix timestamp format', 'timestamp format types', '10-digit', '13-digit', 'format conversion'],
      zh: ['Unix时间戳格式', 'timestamp format types', '10位', '13位', '格式转换']
    }
  }
];
