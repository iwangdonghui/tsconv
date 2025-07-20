/**
 * 时间戳转换工具函数
 */

export interface ParsedInput {
  type: 'timestamp' | 'date';
  value: number;
}

export interface FormattedResult {
  utcDate: string;
  localDate: string;
  timestamp: number;
  iso8601: string;
  relative: string;
}

/**
 * 智能解析输入
 */
export function parseInput(value: string): ParsedInput | null {
  if (!value.trim()) return null;

  const trimmed = value.trim();
  
  // 尝试解析为时间戳（10位或13位数字）
  if (/^\d{10}$/.test(trimmed)) {
    return { type: 'timestamp', value: parseInt(trimmed) * 1000 };
  }
  if (/^\d{13}$/.test(trimmed)) {
    return { type: 'timestamp', value: parseInt(trimmed) };
  }

  // 尝试解析为日期字符串
  const date = new Date(trimmed);
  if (!isNaN(date.getTime())) {
    return { type: 'date', value: date.getTime() };
  }

  return null;
}

/**
 * 格式化结果
 */
export function formatResults(parsed: ParsedInput): FormattedResult {
  const date = new Date(parsed.value);
  const timestamp = Math.floor(parsed.value / 1000);

  return {
    utcDate: date.toUTCString(),
    localDate: date.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    }),
    timestamp: timestamp,
    iso8601: date.toISOString(),
    relative: getRelativeTime(date)
  };
}

/**
 * 获取相对时间
 */
export function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (Math.abs(diffInSeconds) < 60) {
    return diffInSeconds >= 0 ? `${diffInSeconds} seconds ago` : `in ${Math.abs(diffInSeconds)} seconds`;
  }
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (Math.abs(diffInMinutes) < 60) {
    return diffInMinutes >= 0 ? `${diffInMinutes} minutes ago` : `in ${Math.abs(diffInMinutes)} minutes`;
  }
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (Math.abs(diffInHours) < 24) {
    return diffInHours >= 0 ? `${diffInHours} hours ago` : `in ${Math.abs(diffInHours)} hours`;
  }
  
  const diffInDays = Math.floor(diffInHours / 24);
  return diffInDays >= 0 ? `${diffInDays} days ago` : `in ${Math.abs(diffInDays)} days`;
}

/**
 * 批量转换处理
 */
export function processBatchConversion(input: string): string {
  const lines = input.trim().split('\n').filter(line => line.trim());
  const results = lines.map(line => {
    const trimmed = line.trim();
    const parsed = parseInput(trimmed);
    if (!parsed) return `${trimmed} → Invalid format`;
    
    const date = new Date(parsed.value);
    if (parsed.type === 'timestamp') {
      return `${trimmed} → ${date.toISOString()} (${date.toLocaleString()})`;
    } else {
      return `${trimmed} → ${Math.floor(parsed.value / 1000)}`;
    }
  });
  return results.join('\n');
}

/**
 * 手动日期转换
 */
export interface ManualDate {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

export function getManualTimestamp(manualDate: ManualDate): number {
  const date = new Date(
    manualDate.year, 
    manualDate.month - 1, 
    manualDate.day, 
    manualDate.hour, 
    manualDate.minute, 
    manualDate.second
  );
  return Math.floor(date.getTime() / 1000);
}

/**
 * 验证时间戳范围
 */
export function isValidTimestamp(timestamp: number): boolean {
  // Unix timestamp 范围: 1970-01-01 到 2038-01-19
  return timestamp >= 0 && timestamp <= 2147483647;
}

/**
 * 验证日期字符串
 */
export function isValidDateString(dateString: string): boolean {
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}