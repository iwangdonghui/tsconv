import { VercelRequest, VercelResponse } from '@vercel/node';
import { APIErrorHandler, createCorsHeaders, validateRequest } from '../utils/response';

interface VisualizationRequest {
  type: 'timeline' | 'chart' | 'calendar' | 'comparison';
  data: Array<{
    timestamp: number;
    label?: string;
    value?: number;
    category?: string;
  }>;
  options?: {
    timezone?: string;
    format?: string;
    groupBy?: 'hour' | 'day' | 'week' | 'month';
    theme?: 'light' | 'dark';
    width?: number;
    height?: number;
  };
}

interface VisualizationResponse {
  success: boolean;
  data: {
    type: string;
    visualization: any;
    metadata: {
      dataPoints: number;
      timeRange: {
        start: number;
        end: number;
        duration: number;
      };
      timezone: string;
      generatedAt: number;
    };
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  const corsHeaders = createCorsHeaders(req.headers.origin as string);
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests for visualization
  if (req.method !== 'POST') {
    return APIErrorHandler.handleMethodNotAllowed(res, 'Only POST method is allowed for visualization');
  }

  try {
    const startTime = Date.now();

    // Validate request
    const validation = validateRequest(req);
    if (!validation.valid) {
      return APIErrorHandler.handleValidationError(res, validation);
    }

    const vizRequest: VisualizationRequest = req.body;

    // Validate visualization request
    const validationResult = validateVisualizationRequest(vizRequest);
    if (!validationResult.valid) {
      return APIErrorHandler.handleBadRequest(res, validationResult.message || 'Invalid request', validationResult.details);
    }

    // Generate visualization
    const visualization = await generateVisualization(vizRequest);

    const response: VisualizationResponse = {
      success: true,
      data: visualization
    };

    APIErrorHandler.sendSuccess(res, response, {
      processingTime: Date.now() - startTime,
      itemCount: vizRequest.data.length,
      cacheHit: false
    });

  } catch (error) {
    console.error('Visualization error:', error);
    APIErrorHandler.handleServerError(res, error as Error, {
      endpoint: 'visualization'
    });
  }
}

function validateVisualizationRequest(request: VisualizationRequest): { valid: boolean; message?: string; details?: any } {
  const validTypes = ['timeline', 'chart', 'calendar', 'comparison'];
  
  if (!request.type || !validTypes.includes(request.type)) {
    return {
      valid: false,
      message: 'Invalid or missing visualization type',
      details: {
        validTypes,
        received: request.type
      }
    };
  }

  if (!request.data || !Array.isArray(request.data)) {
    return {
      valid: false,
      message: 'Data array is required',
      details: {
        expected: 'Array of data points with timestamp property',
        received: typeof request.data
      }
    };
  }

  if (request.data.length === 0) {
    return {
      valid: false,
      message: 'Data array cannot be empty',
      details: { minDataPoints: 1 }
    };
  }

  if (request.data.length > 1000) {
    return {
      valid: false,
      message: 'Too many data points for visualization',
      details: {
        maxDataPoints: 1000,
        received: request.data.length
      }
    };
  }

  // Validate data points
  for (let i = 0; i < request.data.length; i++) {
    const point = request.data[i];
    if (!point.timestamp || typeof point.timestamp !== 'number') {
      return {
        valid: false,
        message: `Invalid timestamp at data point ${i}`,
        details: {
          index: i,
          expected: 'number',
          received: typeof point.timestamp
        }
      };
    }
  }

  // Validate options
  if (request.options) {
    const { groupBy, theme, width, height } = request.options;
    
    if (groupBy && !['hour', 'day', 'week', 'month'].includes(groupBy)) {
      return {
        valid: false,
        message: 'Invalid groupBy option',
        details: {
          validOptions: ['hour', 'day', 'week', 'month'],
          received: groupBy
        }
      };
    }

    if (theme && !['light', 'dark'].includes(theme)) {
      return {
        valid: false,
        message: 'Invalid theme option',
        details: {
          validOptions: ['light', 'dark'],
          received: theme
        }
      };
    }

    if (width && (width < 100 || width > 2000)) {
      return {
        valid: false,
        message: 'Width must be between 100 and 2000 pixels',
        details: { min: 100, max: 2000, received: width }
      };
    }

    if (height && (height < 100 || height > 1000)) {
      return {
        valid: false,
        message: 'Height must be between 100 and 1000 pixels',
        details: { min: 100, max: 1000, received: height }
      };
    }
  }

  return { valid: true };
}

async function generateVisualization(request: VisualizationRequest): Promise<any> {
  const { type, data, options = {} } = request;
  const timezone = options.timezone || 'UTC';
  const theme = options.theme || 'light';
  const width = options.width || 800;
  const height = options.height || 400;

  // Calculate time range
  const timestamps = data.map(d => d.timestamp);
  const startTime = Math.min(...timestamps);
  const endTime = Math.max(...timestamps);
  const duration = endTime - startTime;

  // Process data based on visualization type
  let visualization: any;

  switch (type) {
    case 'timeline':
      visualization = generateTimeline(data, options, timezone);
      break;
    case 'chart':
      visualization = generateChart(data, options, timezone);
      break;
    case 'calendar':
      visualization = generateCalendar(data, options, timezone);
      break;
    case 'comparison':
      visualization = generateComparison(data, options, timezone);
      break;
    default:
      throw new Error(`Unsupported visualization type: ${type}`);
  }

  return {
    type,
    visualization: {
      ...visualization,
      config: {
        theme,
        width,
        height,
        timezone
      }
    },
    metadata: {
      dataPoints: data.length,
      timeRange: {
        start: startTime,
        end: endTime,
        duration
      },
      timezone,
      generatedAt: Date.now()
    }
  };
}

function generateTimeline(data: any[], options: any, timezone: string): any {
  // Sort data by timestamp
  const sortedData = [...data].sort((a, b) => a.timestamp - b.timestamp);
  
  // Group data if requested
  const groupBy = options.groupBy;
  let processedData = sortedData;

  if (groupBy) {
    processedData = groupDataByTime(sortedData, groupBy, timezone);
  }

  // Format data for timeline visualization
  const timelineData = processedData.map(point => ({
    x: point.timestamp * 1000, // Convert to milliseconds for JavaScript Date
    y: point.value || 1,
    label: point.label || formatTimestamp(point.timestamp, timezone),
    category: point.category || 'default',
    timestamp: point.timestamp
  }));

  return {
    type: 'timeline',
    data: timelineData,
    axes: {
      x: {
        type: 'time',
        label: 'Time',
        timezone
      },
      y: {
        type: 'linear',
        label: 'Value'
      }
    },
    groupBy: groupBy || null
  };
}

function generateChart(data: any[], options: any, timezone: string): any {
  const groupBy = options.groupBy || 'day';
  const groupedData = groupDataByTime(data, groupBy, timezone);

  // Aggregate values for each group
  const chartData = groupedData.map(group => ({
    x: formatTimestamp(group.timestamp, timezone, groupBy),
    y: group.value || group.count || 1,
    timestamp: group.timestamp,
    label: group.label || formatTimestamp(group.timestamp, timezone, groupBy)
  }));

  return {
    type: 'chart',
    chartType: 'line', // Could be extended to support bar, pie, etc.
    data: chartData,
    axes: {
      x: {
        type: 'category',
        label: `Time (${groupBy})`,
        timezone
      },
      y: {
        type: 'linear',
        label: 'Count/Value'
      }
    },
    groupBy
  };
}

function generateCalendar(data: any[], options: any, timezone: string): any {
  // Group data by date
  const dateGroups: Record<string, any[]> = {};
  
  data.forEach(point => {
    const date = new Date(point.timestamp * 1000);
    const dateKey = date.toLocaleDateString('en-CA', { timeZone: timezone }); // YYYY-MM-DD format
    
    if (!dateGroups[dateKey]) {
      dateGroups[dateKey] = [];
    }
    dateGroups[dateKey].push(point);
  });

  // Create calendar data
  const calendarData = Object.entries(dateGroups).map(([date, points]) => ({
    date,
    count: points.length,
    value: points.reduce((sum, p) => sum + (p.value || 1), 0),
    points: points.map(p => ({
      timestamp: p.timestamp,
      label: p.label,
      value: p.value
    }))
  }));

  // Sort by date
  calendarData.sort((a, b) => a.date.localeCompare(b.date));

  return {
    type: 'calendar',
    data: calendarData,
    dateRange: {
      start: calendarData[0]?.date,
      end: calendarData[calendarData.length - 1]?.date
    },
    timezone,
    summary: {
      totalDays: calendarData.length,
      totalEvents: data.length,
      averagePerDay: data.length / calendarData.length
    }
  };
}

function generateComparison(data: any[], options: any, timezone: string): any {
  // Group data by category if available
  const categories = [...new Set(data.map(d => d.category || 'default'))];
  
  const comparisonData = categories.map(category => {
    const categoryData = data.filter(d => (d.category || 'default') === category);
    const values = categoryData.map(d => d.value || 1);
    
    return {
      category,
      count: categoryData.length,
      total: values.reduce((sum, v) => sum + v, 0),
      average: values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : 0,
      min: values.length > 0 ? Math.min(...values) : 0,
      max: values.length > 0 ? Math.max(...values) : 0,
      timestamps: categoryData.map(d => d.timestamp)
    };
  });

  return {
    type: 'comparison',
    data: comparisonData,
    summary: {
      totalCategories: categories.length,
      totalDataPoints: data.length,
      timeRange: {
        start: Math.min(...data.map(d => d.timestamp)),
        end: Math.max(...data.map(d => d.timestamp))
      }
    },
    timezone
  };
}

function groupDataByTime(data: any[], groupBy: string, timezone: string): any[] {
  const groups: Record<string, any[]> = {};
  
  data.forEach(point => {
    const date = new Date(point.timestamp * 1000);
    let groupKey: string;
    
    switch (groupBy) {
      case 'hour':
        groupKey = date.toISOString().substring(0, 13); // YYYY-MM-DDTHH
        break;
      case 'day':
        groupKey = date.toLocaleDateString('en-CA', { timeZone: timezone }); // YYYY-MM-DD
        break;
      case 'week':
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        groupKey = weekStart.toLocaleDateString('en-CA', { timeZone: timezone });
        break;
      case 'month':
        groupKey = date.toLocaleDateString('en-CA', { timeZone: timezone }).substring(0, 7); // YYYY-MM
        break;
      default:
        groupKey = point.timestamp.toString();
    }
    
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(point);
  });

  // Convert groups to array and aggregate
  return Object.entries(groups).map(([key, points]) => {
    const firstPoint = points[0];
    const values = points.map(p => p.value || 1);
    
    return {
      timestamp: firstPoint.timestamp,
      groupKey: key,
      count: points.length,
      value: values.reduce((sum, v) => sum + v, 0),
      average: values.reduce((sum, v) => sum + v, 0) / values.length,
      points
    };
  }).sort((a, b) => a.timestamp - b.timestamp);
}

function formatTimestamp(timestamp: number, timezone: string, groupBy?: string): string {
  const date = new Date(timestamp * 1000);
  
  switch (groupBy) {
    case 'hour':
      return date.toLocaleString('en-US', { 
        timeZone: timezone,
        month: 'short',
        day: 'numeric',
        hour: 'numeric'
      });
    case 'day':
      return date.toLocaleDateString('en-US', { 
        timeZone: timezone,
        month: 'short',
        day: 'numeric'
      });
    case 'week':
      return `Week of ${date.toLocaleDateString('en-US', { 
        timeZone: timezone,
        month: 'short',
        day: 'numeric'
      })}`;
    case 'month':
      return date.toLocaleDateString('en-US', { 
        timeZone: timezone,
        year: 'numeric',
        month: 'long'
      });
    default:
      return date.toLocaleString('en-US', { timeZone: timezone });
  }
}