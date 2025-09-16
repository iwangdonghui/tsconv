// Safe wrapper for localStorage operations
export function safeLocalStorage() {
  const isAvailable = () => {
    try {
      const test = '__localStorage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  };

  return {
    getItem: (key: string): string | null => {
      if (!isAvailable()) return null;
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    setItem: (key: string, value: string): boolean => {
      if (!isAvailable()) return false;
      try {
        localStorage.setItem(key, value);
        return true;
      } catch {
        return false;
      }
    },
    removeItem: (key: string): boolean => {
      if (!isAvailable()) return false;
      try {
        localStorage.removeItem(key);
        return true;
      } catch {
        return false;
      }
    },
  };
}
