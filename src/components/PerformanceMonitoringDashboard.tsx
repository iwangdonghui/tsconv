/**
 * Performance Monitoring Dashboard
 *
 * A development-only dashboard for monitoring Web Vitals and performance metrics
 */

import { Activity, BarChart3, Clock, Cpu, Eye, EyeOff, MemoryStick, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getPerformanceMonitor } from '../lib/performance-monitoring';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface PerformanceData {
  webVitals: Record<string, any[]>;
  customMetrics: any;
  totalMetrics: number;
}

export function PerformanceMonitoringDashboard() {
  const [isVisible, setIsVisible] = useState(false);
  const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // Only show in development
  if (import.meta.env?.PROD) {
    return null;
  }

  useEffect(() => {
    const updateData = () => {
      const monitor = getPerformanceMonitor();
      if (monitor) {
        setPerformanceData(monitor.getPerformanceSummary());
      }
    };

    // Update data every 5 seconds
    const interval = setInterval(updateData, 5000);
    updateData(); // Initial update

    return () => clearInterval(interval);
  }, []);

  const getRatingColor = (rating: string) => {
    switch (rating) {
      case 'good':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'needs-improvement':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'poor':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const formatValue = (name: string, value: number) => {
    if (name === 'CLS') {
      return value.toFixed(3);
    }
    if (name.includes('memory') || name.includes('Memory')) {
      return `${Math.round(value)}%`;
    }
    return `${Math.round(value)}ms`;
  };

  const getMetricIcon = (name: string) => {
    switch (name) {
      case 'LCP':
        return <Eye className='w-4 h-4' />;
      case 'INP':
        return <Zap className='w-4 h-4' />;
      case 'CLS':
        return <BarChart3 className='w-4 h-4' />;
      case 'FCP':
        return <Clock className='w-4 h-4' />;
      case 'TTFB':
        return <Activity className='w-4 h-4' />;
      default:
        return <Cpu className='w-4 h-4' />;
    }
  };

  if (!isVisible) {
    return (
      <Button
        size='sm'
        variant='outline'
        className='fixed bottom-4 left-4 z-50 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'
        onClick={() => setIsVisible(true)}
      >
        <Activity className='w-4 h-4 mr-2' />
        Performance
      </Button>
    );
  }

  return (
    <div className='fixed bottom-4 left-4 z-50 max-w-md'>
      <Card className='bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-blue-200 dark:border-blue-800 shadow-lg'>
        <CardHeader className='pb-3'>
          <div className='flex items-center justify-between'>
            <CardTitle className='text-sm font-medium text-blue-700 dark:text-blue-300 flex items-center gap-2'>
              <Activity className='w-4 h-4' />
              Performance Monitor
            </CardTitle>
            <div className='flex items-center gap-2'>
              <Button
                size='sm'
                variant='ghost'
                onClick={() => setIsExpanded(!isExpanded)}
                className='h-6 w-6 p-0'
              >
                {isExpanded ? <EyeOff className='w-3 h-3' /> : <Eye className='w-3 h-3' />}
              </Button>
              <Button
                size='sm'
                variant='ghost'
                onClick={() => setIsVisible(false)}
                className='h-6 w-6 p-0'
              >
                ×
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className='pt-0'>
          {performanceData ? (
            <div className='space-y-3'>
              {/* Web Vitals Summary */}
              <div>
                <div className='text-xs font-medium text-gray-600 dark:text-gray-400 mb-2'>
                  Web Vitals
                </div>
                <div className='grid grid-cols-2 gap-2'>
                  {Object.entries(performanceData.webVitals).map(([name, metrics]) => {
                    const latestMetric = metrics[metrics.length - 1];
                    if (!latestMetric) return null;

                    return (
                      <div key={name} className='flex items-center justify-between text-xs'>
                        <div className='flex items-center gap-1'>
                          {getMetricIcon(name)}
                          <span className='font-medium'>{name}</span>
                        </div>
                        <Badge
                          variant='secondary'
                          className={`text-xs ${getRatingColor(latestMetric.rating)}`}
                        >
                          {formatValue(name, latestMetric.value)}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Custom Metrics */}
              {isExpanded && (
                <div>
                  <div className='text-xs font-medium text-gray-600 dark:text-gray-400 mb-2'>
                    Custom Metrics
                  </div>
                  <div className='space-y-1'>
                    {performanceData.customMetrics.pageLoadTime > 0 && (
                      <div className='flex items-center justify-between text-xs'>
                        <span>Page Load</span>
                        <Badge variant='outline' className='text-xs'>
                          {Math.round(performanceData.customMetrics.pageLoadTime)}ms
                        </Badge>
                      </div>
                    )}
                    {performanceData.customMetrics.domContentLoadedTime > 0 && (
                      <div className='flex items-center justify-between text-xs'>
                        <span>DOM Ready</span>
                        <Badge variant='outline' className='text-xs'>
                          {Math.round(performanceData.customMetrics.domContentLoadedTime)}ms
                        </Badge>
                      </div>
                    )}
                    {performanceData.customMetrics.memoryUsage && (
                      <div className='flex items-center justify-between text-xs'>
                        <div className='flex items-center gap-1'>
                          <MemoryStick className='w-3 h-3' />
                          <span>Memory</span>
                        </div>
                        <Badge
                          variant='outline'
                          className={`text-xs ${
                            performanceData.customMetrics.memoryUsage > 0.8
                              ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                              : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                          }`}
                        >
                          {Math.round(performanceData.customMetrics.memoryUsage * 100)}%
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* API Response Times */}
              {isExpanded &&
                Object.keys(performanceData.customMetrics.apiResponseTimes).length > 0 && (
                  <div>
                    <div className='text-xs font-medium text-gray-600 dark:text-gray-400 mb-2'>
                      API Response Times
                    </div>
                    <div className='space-y-1'>
                      {Object.entries(performanceData.customMetrics.apiResponseTimes).map(
                        ([endpoint, times]) => {
                          const avgTime =
                            (times as number[]).reduce((sum, time) => sum + time, 0) /
                            (times as number[]).length;
                          return (
                            <div
                              key={endpoint}
                              className='flex items-center justify-between text-xs'
                            >
                              <span className='truncate max-w-24' title={endpoint}>
                                {endpoint.split('/').pop()}
                              </span>
                              <Badge
                                variant='outline'
                                className={`text-xs ${
                                  avgTime > 1000
                                    ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                                    : avgTime > 500
                                      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                                      : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                                }`}
                              >
                                {Math.round(avgTime)}ms
                              </Badge>
                            </div>
                          );
                        }
                      )}
                    </div>
                  </div>
                )}

              {/* Summary */}
              <div className='pt-2 border-t border-gray-200 dark:border-gray-700'>
                <div className='flex items-center justify-between text-xs text-gray-500 dark:text-gray-400'>
                  <span>Total Metrics</span>
                  <span>{performanceData.totalMetrics}</span>
                </div>
              </div>

              {/* Actions */}
              {isExpanded && (
                <div className='flex gap-2'>
                  <Button
                    size='sm'
                    variant='outline'
                    className='text-xs h-7'
                    onClick={() => {
                      const monitor = getPerformanceMonitor();
                      if (monitor) {
                        console.log('Performance Summary:', monitor.getPerformanceSummary());
                      }
                    }}
                  >
                    Log Data
                  </Button>
                  <Button
                    size='sm'
                    variant='outline'
                    className='text-xs h-7'
                    onClick={() => {
                      const monitor = getPerformanceMonitor();
                      if (monitor) {
                        monitor.clearMetrics();
                        setPerformanceData(monitor.getPerformanceSummary());
                      }
                    }}
                  >
                    Clear
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className='text-xs text-gray-500 dark:text-gray-400 text-center py-4'>
              Initializing performance monitoring...
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
