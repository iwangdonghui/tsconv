import { useMemo } from 'react';

interface DateSuggestion {
  label: string;
  value: string;
  category: 'holiday' | 'personal' | 'business' | 'seasonal';
  icon: string;
}

// Get intelligent date suggestions based on context
export function useSmartSuggestions(currentDate: Date = new Date()) {
  return useMemo(() => {
    const suggestions: DateSuggestion[] = [];
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const day = currentDate.getDate();

    // Upcoming holidays
    const holidays = [
      { date: new Date(year, 0, 1), label: "New Year's Day", icon: '🎊' },
      { date: new Date(year, 1, 14), label: "Valentine's Day", icon: '❤️' },
      { date: new Date(year, 3, 1), label: 'April Fools', icon: '🃏' },
      { date: new Date(year, 6, 4), label: 'Independence Day', icon: '🎆' },
      { date: new Date(year, 9, 31), label: 'Halloween', icon: '🎃' },
      { date: new Date(year, 10, 28), label: 'Thanksgiving', icon: '🦃' },
      { date: new Date(year, 11, 25), label: 'Christmas', icon: '🎄' },
    ];

    // Add upcoming holidays
    holidays.forEach(holiday => {
      if (holiday.date > currentDate) {
        try {
          const dateStr = holiday.date.toISOString().split('T')[0];
          if (dateStr) {
            suggestions.push({
              label: `Days until ${holiday.label}`,
              value: dateStr,
              category: 'holiday',
              icon: holiday.icon,
            });
          }
        } catch (e) {
          console.error('Error processing holiday:', e);
        }
      }
    });

    // Business periods
    const quarterEnd = new Date(year, Math.floor(month / 3) * 3 + 3, 0);
    const yearEnd = new Date(year, 11, 31);
    const fiscalYearEnd = new Date(month >= 3 ? year + 1 : year, 3, 0);

    try {
      suggestions.push(
        {
          label: 'Days until quarter end',
          value: quarterEnd.toISOString().split('T')[0] || '',
          category: 'business',
          icon: '📊',
        },
        {
          label: 'Days until year end',
          value: yearEnd.toISOString().split('T')[0] || '',
          category: 'business',
          icon: '📅',
        },
        {
          label: 'Days until fiscal year end',
          value: fiscalYearEnd.toISOString().split('T')[0] || '',
          category: 'business',
          icon: '💰',
        }
      );
    } catch (e) {
      console.error('Error processing business periods:', e);
    }

    // Seasonal events
    const seasons = [
      { date: new Date(year, 2, 20), label: 'Spring', icon: '🌸' },
      { date: new Date(year, 5, 21), label: 'Summer', icon: '☀️' },
      { date: new Date(year, 8, 22), label: 'Fall', icon: '🍂' },
      { date: new Date(year, 11, 21), label: 'Winter', icon: '❄️' },
    ];

    seasons.forEach(season => {
      if (season.date > currentDate) {
        try {
          const dateStr = season.date.toISOString().split('T')[0];
          if (dateStr) {
            suggestions.push({
              label: `Days until ${season.label}`,
              value: dateStr,
              category: 'seasonal',
              icon: season.icon,
            });
          }
        } catch (e) {
          console.error('Error processing season:', e);
        }
      }
    });

    // Personal milestones
    try {
      const nextBirthday = new Date(year + 1, month, day);
      const birthdayStr = nextBirthday.toISOString().split('T')[0];
      if (birthdayStr) {
        suggestions.push({
          label: 'Days until next birthday',
          value: birthdayStr,
          category: 'personal',
          icon: '🎂',
        });
      }
    } catch (e) {
      console.error('Error processing personal milestones:', e);
    }

    // Sort by date proximity
    return suggestions
      .filter(s => new Date(s.value) > currentDate)
      .sort((a, b) => new Date(a.value).getTime() - new Date(b.value).getTime())
      .slice(0, 6);
  }, [currentDate]);
}

// Predict user intent based on input patterns
export function usePredictiveInput(input: string): string[] {
  const predictions: string[] = [];
  const lowerInput = input.toLowerCase();

  const patterns = [
    { match: /^(\d+)\s*y/i, suggestion: '$1 years ago', future: 'in $1 years' },
    { match: /^(\d+)\s*m/i, suggestion: '$1 months ago', future: 'in $1 months' },
    { match: /^(\d+)\s*w/i, suggestion: '$1 weeks ago', future: 'in $1 weeks' },
    { match: /^(\d+)\s*d/i, suggestion: '$1 days ago', future: 'in $1 days' },
    { match: /^last\s/i, suggestion: 'last week', alternatives: ['last month', 'last year'] },
    { match: /^next\s/i, suggestion: 'next week', alternatives: ['next month', 'next year'] },
    { match: /^tod/i, suggestion: 'today', alternatives: ['tomorrow'] },
    { match: /^yes/i, suggestion: 'yesterday', alternatives: [] },
    { match: /^tom/i, suggestion: 'tomorrow', alternatives: [] },
  ];

  patterns.forEach(pattern => {
    if (pattern.match.test(lowerInput)) {
      const match = lowerInput.match(pattern.match);
      if (match) {
        // Add main suggestion
        predictions.push(pattern.suggestion.replace('$1', match[1] || ''));

        // Add future variant if applicable
        if (pattern.future) {
          predictions.push(pattern.future.replace('$1', match[1] || ''));
        }

        // Add alternatives
        if (pattern.alternatives) {
          predictions.push(...pattern.alternatives);
        }
      }
    }
  });

  // Month name predictions
  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  months.forEach(month => {
    if (month.toLowerCase().startsWith(lowerInput)) {
      predictions.push(month);
      predictions.push(`${month} 1`);
      predictions.push(`${month} 15`);
    }
  });

  // Day name predictions
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  days.forEach(day => {
    if (day.toLowerCase().startsWith(lowerInput)) {
      predictions.push(`last ${day}`);
      predictions.push(`next ${day}`);
    }
  });

  return [...new Set(predictions)].slice(0, 5);
}
