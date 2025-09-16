import { safeLocalStorage } from './safeStorage';

// LocalStorage keys
const STORAGE_KEYS = {
  THEME: 'tsconv_theme',
  INCLUDE_TIME: 'tsconv_include_time',
  ABSOLUTE_MODE: 'tsconv_absolute_mode',
  LAST_MODE: 'tsconv_last_mode',
  FAVORITE_PRESETS: 'tsconv_favorite_presets',
  CUSTOM_FORMATS: 'tsconv_custom_formats',
  TOUR_COMPLETED: 'tsconv_tour_completed',
  LAST_VISITED: 'tsconv_last_visited',
  USAGE_STATS: 'tsconv_usage_stats',
} as const;

interface UserPreferences {
  theme?: 'light' | 'dark' | 'system';
  includeTime?: boolean;
  absoluteMode?: boolean;
  lastMode?: 'date-diff' | 'age' | 'countdown';
  favoritePresets?: string[];
  customFormats?: string[];
  tourCompleted?: boolean;
}

interface UsageStats {
  totalCalculations: number;
  mostUsedMode: string;
  mostCommonPreset: string;
  averageTimeBetweenDates: number;
  lastVisited: string;
}

export class PreferenceManager {
  private static storage = safeLocalStorage();

  // Save preference
  static save<K extends keyof typeof STORAGE_KEYS>(key: K, value: unknown): void {
    try {
      this.storage.setItem(STORAGE_KEYS[key], JSON.stringify(value));
    } catch (error) {
      console.error(`Failed to save preference ${key}:`, error);
    }
  }

  // Load preference
  static load<T = unknown>(key: keyof typeof STORAGE_KEYS): T | null {
    try {
      const item = this.storage.getItem(STORAGE_KEYS[key]);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error(`Failed to load preference ${key}:`, error);
      return null;
    }
  }

  // Load all preferences
  static loadAll(): UserPreferences {
    return {
      theme: this.load<'light' | 'dark' | 'system'>('THEME') || undefined,
      includeTime: this.load<boolean>('INCLUDE_TIME') || undefined,
      absoluteMode: this.load<boolean>('ABSOLUTE_MODE') || undefined,
      lastMode: this.load<'date-diff' | 'age' | 'countdown'>('LAST_MODE') || undefined,
      favoritePresets: this.load<string[]>('FAVORITE_PRESETS') || undefined,
      customFormats: this.load<string[]>('CUSTOM_FORMATS') || undefined,
      tourCompleted: this.load<boolean>('TOUR_COMPLETED') || undefined,
    };
  }

  // Clear all preferences
  static clearAll(): void {
    Object.values(STORAGE_KEYS).forEach(key => {
      this.storage.removeItem(key);
    });
  }

  // Track usage statistics
  static trackUsage(mode: string, preset?: string, daysBetweenDates?: number): void {
    const stats = this.load<UsageStats>('USAGE_STATS') || {
      totalCalculations: 0,
      mostUsedMode: mode,
      mostCommonPreset: preset || '',
      averageTimeBetweenDates: 0,
      lastVisited: new Date().toISOString(),
    };

    stats.totalCalculations++;
    stats.lastVisited = new Date().toISOString();

    // Update average time between dates
    if (daysBetweenDates !== undefined) {
      const currentAvg = stats.averageTimeBetweenDates;
      const total = stats.totalCalculations;
      stats.averageTimeBetweenDates = (currentAvg * (total - 1) + daysBetweenDates) / total;
    }

    this.save('USAGE_STATS', stats);
  }

  // Get personalized recommendations based on usage
  static getRecommendations(): {
    suggestedMode: string;
    suggestedPreset: string;
    timeRange: string;
  } {
    const stats = this.load<UsageStats>('USAGE_STATS');

    if (!stats) {
      return {
        suggestedMode: 'date-diff',
        suggestedPreset: 'week',
        timeRange: '7 days',
      };
    }

    // Suggest time range based on average
    let timeRange = '7 days';
    if (stats.averageTimeBetweenDates > 365) {
      timeRange = '1 year';
    } else if (stats.averageTimeBetweenDates > 30) {
      timeRange = '1 month';
    }

    return {
      suggestedMode: stats.mostUsedMode || 'date-diff',
      suggestedPreset: stats.mostCommonPreset || 'week',
      timeRange,
    };
  }

  // Check if user is returning
  static isReturningUser(): boolean {
    const lastVisited = this.load<string>('LAST_VISITED');
    if (!lastVisited) return false;

    const daysSinceLastVisit =
      (Date.now() - new Date(lastVisited).getTime()) / (1000 * 60 * 60 * 24);

    return daysSinceLastVisit > 1;
  }

  // Get welcome message for returning users
  static getWelcomeMessage(): string | null {
    if (!this.isReturningUser()) return null;

    const stats = this.load<UsageStats>('USAGE_STATS');
    if (!stats) return 'Welcome back!';

    const lastVisited = new Date(stats.lastVisited);
    const daysAgo = Math.floor((Date.now() - lastVisited.getTime()) / (1000 * 60 * 60 * 24));

    if (daysAgo === 1) {
      return 'Welcome back! You were here yesterday.';
    } else if (daysAgo < 7) {
      return `Welcome back! You were here ${daysAgo} days ago.`;
    } else if (daysAgo < 30) {
      return `Welcome back! It's been ${Math.floor(daysAgo / 7)} weeks.`;
    } else {
      return `Welcome back! It's been a while!`;
    }
  }
}

// React hook for preferences
import { useEffect, useState } from 'react';

export function usePreferences() {
  const [preferences, setPreferences] = useState<UserPreferences>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load preferences on mount
    const loaded = PreferenceManager.loadAll();
    setPreferences(loaded);
    setIsLoading(false);

    // Track visit
    PreferenceManager.save('LAST_VISITED', new Date().toISOString());
  }, []);

  const updatePreference = <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
    setPreferences(prev => ({ ...prev, [key]: value }));

    // Map preference keys to storage keys
    const storageKeyMap: Record<keyof UserPreferences, keyof typeof STORAGE_KEYS> = {
      theme: 'THEME',
      includeTime: 'INCLUDE_TIME',
      absoluteMode: 'ABSOLUTE_MODE',
      lastMode: 'LAST_MODE',
      favoritePresets: 'FAVORITE_PRESETS',
      customFormats: 'CUSTOM_FORMATS',
      tourCompleted: 'TOUR_COMPLETED',
    };

    PreferenceManager.save(storageKeyMap[key], value);
  };

  return {
    preferences,
    updatePreference,
    isLoading,
    clearAll: () => {
      PreferenceManager.clearAll();
      setPreferences({});
    },
  };
}
