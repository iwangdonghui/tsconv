/**
 * Parse natural language date inputs into ISO date strings
 */
export function parseNaturalDate(input: string): string | null {
  if (!input) return null;
  
  const normalizedInput = input.toLowerCase().trim();
  const today = new Date();
  
  // Direct date keywords
  const keywords: Record<string, () => Date> = {
    'today': () => new Date(),
    'now': () => new Date(),
    'tomorrow': () => {
      const date = new Date();
      date.setDate(date.getDate() + 1);
      return date;
    },
    'yesterday': () => {
      const date = new Date();
      date.setDate(date.getDate() - 1);
      return date;
    },
    'next week': () => {
      const date = new Date();
      date.setDate(date.getDate() + 7);
      return date;
    },
    'last week': () => {
      const date = new Date();
      date.setDate(date.getDate() - 7);
      return date;
    },
    'next month': () => {
      const date = new Date();
      date.setMonth(date.getMonth() + 1);
      return date;
    },
    'last month': () => {
      const date = new Date();
      date.setMonth(date.getMonth() - 1);
      return date;
    },
    'next year': () => {
      const date = new Date();
      date.setFullYear(date.getFullYear() + 1);
      return date;
    },
    'last year': () => {
      const date = new Date();
      date.setFullYear(date.getFullYear() - 1);
      return date;
    },
    'new year': () => new Date(today.getFullYear() + 1, 0, 1),
    'christmas': () => new Date(today.getFullYear(), 11, 25),
    'new years': () => new Date(today.getFullYear() + 1, 0, 1),
    'new years eve': () => new Date(today.getFullYear(), 11, 31),
  };

  // Check for exact keyword match
  if (keywords[normalizedInput]) {
    const dateStr = keywords[normalizedInput]().toISOString().split('T')[0];
    return dateStr || null;
  }

  // Parse relative dates with numbers (e.g., "3 days ago", "in 5 weeks")
  const relativePatterns = [
    // "X days/weeks/months/years ago"
    /^(\d+)\s+(day|days|week|weeks|month|months|year|years)\s+ago$/,
    // "in X days/weeks/months/years"
    /^in\s+(\d+)\s+(day|days|week|weeks|month|months|year|years)$/,
    // "X days/weeks/months/years from now"
    /^(\d+)\s+(day|days|week|weeks|month|months|year|years)\s+from\s+now$/,
  ];

  for (const pattern of relativePatterns) {
    const match = normalizedInput.match(pattern);
    if (match) {
      const amountMatch = match[1];
      if (!amountMatch) continue;
      const amount = parseInt(amountMatch, 10);
      const unitMatch = match[2];
      if (!unitMatch) continue;
      const unit = unitMatch.replace(/s$/, ''); // Remove plural 's'
      const date = new Date();
      const isAgo = normalizedInput.includes('ago');
      const multiplier = isAgo ? -1 : 1;

      switch (unit) {
        case 'day':
          date.setDate(date.getDate() + (amount * multiplier));
          break;
        case 'week':
          date.setDate(date.getDate() + (amount * 7 * multiplier));
          break;
        case 'month':
          date.setMonth(date.getMonth() + (amount * multiplier));
          break;
        case 'year':
          date.setFullYear(date.getFullYear() + (amount * multiplier));
          break;
      }
      const dateStr = date.toISOString().split('T')[0];
      return dateStr || null;
    }
  }

  // Parse day names (e.g., "monday", "next tuesday", "last friday")
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayIndex = dayNames.findIndex(day => normalizedInput.includes(day));
  
  if (dayIndex !== -1) {
    const date = new Date();
    const currentDay = date.getDay();
    let daysToAdd = dayIndex - currentDay;
    
    if (normalizedInput.includes('next')) {
      // Next week's day
      daysToAdd = daysToAdd <= 0 ? daysToAdd + 7 : daysToAdd;
    } else if (normalizedInput.includes('last')) {
      // Last week's day
      daysToAdd = daysToAdd >= 0 ? daysToAdd - 7 : daysToAdd;
    } else {
      // This week's day (upcoming)
      if (daysToAdd < 0) daysToAdd += 7;
    }
    
    date.setDate(date.getDate() + daysToAdd);
    const dateStr = date.toISOString().split('T')[0];
    return dateStr || null;
  }

  // Month names (e.g., "january 1", "march 15", "december 25")
  const monthNames = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december'
  ];
  
  for (let i = 0; i < monthNames.length; i++) {
    const monthName = monthNames[i];
    if (monthName && normalizedInput.includes(monthName)) {
      const dayMatch = normalizedInput.match(/\d+/);
      const day = dayMatch && dayMatch[0] ? parseInt(dayMatch[0], 10) : 1;
      const yearMatch = normalizedInput.match(/\d{4}/);
      const year = yearMatch && yearMatch[0]
        ? parseInt(yearMatch[0], 10)
        : today.getFullYear();
      
      const date = new Date(year, i, day);
      const dateStr = date.toISOString().split('T')[0];
      return dateStr || null;
    }
  }

  // Special date shortcuts
  const specialDates: Record<string, () => Date> = {
    'start of month': () => new Date(today.getFullYear(), today.getMonth(), 1),
    'end of month': () => new Date(today.getFullYear(), today.getMonth() + 1, 0),
    'start of year': () => new Date(today.getFullYear(), 0, 1),
    'end of year': () => new Date(today.getFullYear(), 11, 31),
    'start of week': () => {
      const date = new Date();
      date.setDate(date.getDate() - date.getDay());
      return date;
    },
    'end of week': () => {
      const date = new Date();
      date.setDate(date.getDate() + (6 - date.getDay()));
      return date;
    },
  };

  if (specialDates[normalizedInput]) {
    const dateStr = specialDates[normalizedInput]().toISOString().split('T')[0];
    return dateStr || null;
  }

  // If no pattern matches, return null (will fall back to regular date input)
  return null;
}