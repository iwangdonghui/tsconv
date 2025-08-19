import { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { mockFormatService, mockTimezoneService } from '../utils/services';
import { translations } from '../utils/translations';
import Footer from './Footer';
import Header from './Header';
import { SEO } from './SEO';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

const EnhancedApiDocs = () => {
  const { isDark } = useTheme();
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState('overview');
  const [testingData, setTestingData] = useState({
    timestamp: '',
    date: '',
    format: 'iso8601',
    timezone: 'UTC',
    targetTimezone: 'UTC',
  });

  const t = translations[language];

  const endpoints = [
    {
      id: 'convert',
      name: 'Convert',
      method: 'GET',
      path: '/api/convert', // served by Cloudflare Pages Functions ('/api')
      description: t.api.convertDescription,
      example: 'https://tsconv.com/api/convert?timestamp=1640995200',
    },
    {
      id: 'now',
      name: 'Current Time',
      method: 'GET',
      path: '/api/now', // served by Cloudflare Pages Functions ('/api')
      description: 'Get current timestamp in multiple formats',
      example: 'https://tsconv.com/api/now?timezone=America/New_York',
    },
    {
      id: 'workdays',
      name: 'Workdays',
      method: 'GET',
      path: '/api/workdays',
      description: 'Calculate business days between dates or add workdays to a date',
      example:
        'https://tsconv.com/api/workdays?startDate=2022-01-01&endDate=2022-01-31&excludeWeekends=true',
    },
    {
      id: 'date-diff',
      name: 'Date Difference',
      method: 'GET',
      path: '/api/date-diff',
      description: 'Calculate the difference between two dates in various units',
      example:
        'https://tsconv.com/api/date-diff?startDate=2022-01-01&endDate=2022-12-31&includeTime=false',
    },
    {
      id: 'format',
      name: 'Format',
      method: 'GET',
      path: '/api/format',
      description: 'Format timestamps using predefined or custom patterns',
      example:
        'https://tsconv.com/api/format?timestamp=1642248600&format=us-datetime&timezone=America/New_York',
    },
    {
      id: 'timezones',
      name: 'Timezones',
      method: 'GET',
      path: '/api/timezones',
      description: 'Search and filter world timezones with real-time information',
      example: 'https://tsconv.com/api/timezones?region=America&country=United%20States',
    },
    {
      id: 'timezone-difference',
      name: 'Timezone Difference',
      method: 'GET',
      path: '/api/timezone-difference',
      description: 'Calculate time difference between two timezones',
      example:
        'https://tsconv.com/api/timezone-difference?from=UTC&to=America/New_York&details=true',
    },
    {
      id: 'timezone-convert',
      name: 'Timezone Convert',
      method: 'GET',
      path: '/api/timezone-convert',
      description: 'Convert timestamps between different timezones',
      example:
        'https://tsconv.com/api/timezone-convert?timestamp=1640995200&from=UTC&to=America/New_York',
    },
    {
      id: 'timezone-info',
      name: 'Timezone Info',
      method: 'GET',
      path: '/api/timezone-info',
      description: 'Get detailed information about a specific timezone',
      example: 'https://tsconv.com/api/timezone-info?timezone=America/New_York&includeHistory=true',
    },
    {
      id: 'batch-convert',
      name: 'Batch Convert',
      method: 'POST',
      path: '/api/batch-convert',
      description: 'Convert multiple timestamps or dates in a single request (max 100 items)',
      example: 'https://tsconv.com/api/batch-convert (POST with JSON body)',
    },
    {
      id: 'formats',
      name: 'Formats',
      method: 'GET',
      path: '/api/formats',
      description: 'Get available date/time formats and format timestamps',
      example: 'https://tsconv.com/api/formats?timestamp=1640995200&format=iso',
    },
    {
      id: 'visualization',
      name: 'Visualization',
      method: 'GET',
      path: '/api/visualization',
      description: 'Generate data for charts and visualizations',
      example: 'https://tsconv.com/api/visualization?type=timezone-chart',
    },
    {
      id: 'health',
      name: 'Health',
      method: 'GET',
      path: '/api/health',
      description: 'Monitor system health and performance',
      example: 'https://tsconv.com/api/health?detailed=true',
    },
  ];

  const formats = mockFormatService.listFormats();
  const timezones = mockTimezoneService.getCommonTimezones();

  return (
    <div
      className={`min-h-screen transition-colors duration-200 ${
        isDark ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-900'
      }`}
    >
      <SEO
        title='API Documentation - Timestamp Converter | tsconv.com'
        description='Complete API documentation for tsconv.com timestamp conversion service. Convert Unix timestamps, handle timezones, batch processing, and more.'
        canonical='https://www.tsconv.com/api'
        ogTitle='API Documentation - Timestamp Converter'
        ogDescription='Complete API documentation for tsconv.com timestamp conversion service. Convert Unix timestamps, handle timezones, batch processing, and more.'
        keywords='timestamp API, unix timestamp API, date conversion API, timezone API, batch conversion API'
      />
      <Header />
      <main className='flex-grow'>
        <div className='container mx-auto px-4 py-8 max-w-7xl overflow-hidden'>
          <div className='text-center mb-8'>
            <h1 className='text-3xl md:text-4xl font-bold mb-4'>{t.api.title}</h1>
            <p className='text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto'>
              {t.api.subtitle}
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className='w-full'>
            <TabsList className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 mb-8 overflow-x-auto'>
              <TabsTrigger value='overview'>{t.api.overview}</TabsTrigger>
              <TabsTrigger value='endpoints'>{t.api.endpoints}</TabsTrigger>
              <TabsTrigger value='testing'>{t.api.testing}</TabsTrigger>
              <TabsTrigger value='formats'>{t.api.formats}</TabsTrigger>
              <TabsTrigger value='examples'>{t.api.examples}</TabsTrigger>
              <TabsTrigger value='monitoring'>{t.api.monitoring}</TabsTrigger>
            </TabsList>

            <TabsContent value='overview' className='space-y-6'>
              <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6'>
                {endpoints.map(endpoint => (
                  <Card
                    key={endpoint.id}
                    className={isDark ? 'bg-slate-800 border-slate-700' : 'bg-white'}
                  >
                    <CardHeader>
                      <div className='flex items-center justify-between'>
                        <CardTitle className='text-lg'>{endpoint.name}</CardTitle>
                        <Badge variant={endpoint.method === 'GET' ? 'default' : 'secondary'}>
                          {endpoint.method}
                        </Badge>
                      </div>
                      <p className='text-sm text-slate-600 dark:text-slate-400'>{endpoint.path}</p>
                    </CardHeader>
                    <CardContent>
                      <p className='text-sm mb-4'>{endpoint.description}</p>
                      <div className='text-xs bg-slate-100 dark:bg-slate-700 p-2 rounded font-mono sm:overflow-visible overflow-x-auto'>
                        <div className='sm:whitespace-normal sm:break-words whitespace-nowrap'>
                          {endpoint.example}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value='endpoints' className='space-y-6'>
              <div className='space-y-6'>
                {endpoints.map(endpoint => (
                  <Card
                    key={endpoint.id}
                    className={isDark ? 'bg-slate-800 border-slate-700' : 'bg-white'}
                  >
                    <CardHeader>
                      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2'>
                        <CardTitle className='text-base sm:text-lg'>{endpoint.name}</CardTitle>
                        <div className='flex flex-wrap gap-2'>
                          <Badge variant={endpoint.method === 'GET' ? 'default' : 'secondary'}>
                            {endpoint.method}
                          </Badge>
                          <Badge variant='outline' className='text-xs break-all'>
                            {endpoint.path}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className='mb-4'>{endpoint.description}</p>

                      <div className='space-y-4'>
                        <div>
                          <h3 className='font-semibold mb-2'>Parameters</h3>
                          <div className='bg-slate-100 dark:bg-slate-700 p-3 rounded text-sm'>
                            <code>{endpoint.example}</code>
                          </div>
                        </div>

                        <div>
                          <h3 className='font-semibold mb-2'>Response Example</h3>
                          <div className='bg-slate-100 dark:bg-slate-700 p-3 rounded text-xs font-mono sm:overflow-visible overflow-x-auto'>
                            <pre className='sm:whitespace-pre-wrap sm:break-words whitespace-pre'>
                              {JSON.stringify(
                                {
                                  success: true,
                                  data: {
                                    timestamp: 1640995200,
                                    utc: 'Sat, 01 Jan 2022 00:00:00 GMT',
                                  },
                                  metadata: { processingTime: 25 },
                                },
                                null,
                                2
                              )}
                            </pre>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value='testing' className='space-y-6'>
              <Card className={isDark ? 'bg-slate-800 border-slate-700' : 'bg-white'}>
                <CardHeader>
                  <CardTitle>API Testing Console</CardTitle>
                  <p className='text-sm text-slate-600 dark:text-slate-400'>
                    Test the API endpoints directly from your browser
                  </p>
                </CardHeader>
                <CardContent>
                  <div className='space-y-4'>
                    <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                      <div>
                        <label className='text-sm font-medium mb-2 block'>Timestamp</label>
                        <Input
                          type='number'
                          placeholder='1640995200'
                          value={testingData.timestamp}
                          onChange={e =>
                            setTestingData(prev => ({ ...prev, timestamp: e.target.value }))
                          }
                          className={isDark ? 'bg-slate-700 border-slate-600' : ''}
                        />
                      </div>
                      <div>
                        <label className='text-sm font-medium mb-2 block'>Date</label>
                        <Input
                          type='text'
                          placeholder='2022-01-01'
                          value={testingData.date}
                          onChange={e =>
                            setTestingData(prev => ({ ...prev, date: e.target.value }))
                          }
                          className={isDark ? 'bg-slate-700 border-slate-600' : ''}
                        />
                      </div>
                    </div>

                    <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                      <div>
                        <label className='text-sm font-medium mb-2 block'>Source Timezone</label>
                        <Select
                          value={testingData.timezone}
                          onValueChange={value =>
                            setTestingData(prev => ({ ...prev, timezone: value }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {timezones.slice(0, 10).map((tz: any) => (
                              <SelectItem key={tz.identifier} value={tz.identifier}>
                                {tz.displayName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className='text-sm font-medium mb-2 block'>Target Timezone</label>
                        <Select
                          value={testingData.targetTimezone}
                          onValueChange={value =>
                            setTestingData(prev => ({ ...prev, targetTimezone: value }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {timezones.slice(0, 10).map((tz: any) => (
                              <SelectItem key={tz.identifier} value={tz.identifier}>
                                {tz.displayName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <label className='text-sm font-medium mb-2 block'>Output Format</label>
                      <Select
                        value={testingData.format}
                        onValueChange={value =>
                          setTestingData(prev => ({ ...prev, format: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {formats.slice(0, 8).map((format: any) => (
                            <SelectItem key={format.name} value={format.name.toLowerCase()}>
                              {format.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <Button
                      className='w-full'
                      onClick={() => {
                        const isDev = window.location.hostname === 'localhost';

                        if (isDev) {
                          // In development/production, use Cloudflare Functions under /api
                          const params = new URLSearchParams();
                          if (testingData.targetTimezone && testingData.targetTimezone !== 'UTC') {
                            params.append('timezone', testingData.targetTimezone);
                          }
                          const url = `${buildApiUrl('api/now')}${params.toString() ? `?${params.toString()}` : ''}`;
                          window.open(url, '_blank');
                        } else {
                          // In production, use /api/convert with all parameters
                          const params = new URLSearchParams();

                          // Add timestamp or date
                          if (testingData.timestamp) {
                            params.append('timestamp', testingData.timestamp);
                          } else if (testingData.date) {
                            params.append('date', testingData.date);
                          } else {
                            // Default to current timestamp if nothing is provided
                            params.append('timestamp', Math.floor(Date.now() / 1000).toString());
                          }

                          // Add timezone parameters if they're not default
                          if (testingData.timezone && testingData.timezone !== 'UTC') {
                            params.append('timezone', testingData.timezone);
                          }
                          if (testingData.targetTimezone && testingData.targetTimezone !== 'UTC') {
                            params.append('targetTimezone', testingData.targetTimezone);
                          }

                          // Add format if it's not default
                          if (testingData.format && testingData.format !== 'iso8601') {
                            params.append('format', testingData.format);
                          }

                          const url = `${buildApiUrl('api/convert')}?${params.toString()}`;
                          window.open(url, '_blank');
                        }
                      }}
                    >
                      Test API
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value='formats' className='space-y-6'>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6'>
                {['standard', 'human', 'regional', 'technical'].map(category => (
                  <Card
                    key={category}
                    className={isDark ? 'bg-slate-800 border-slate-700' : 'bg-white'}
                  >
                    <CardHeader>
                      <CardTitle className='capitalize'>{category} Formats</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className='space-y-3'>
                        {formats
                          .filter((f: any) => f.category === category)
                          .map((format: any) => (
                            <div key={format.name} className='text-sm'>
                              <div className='font-medium'>{format.name}</div>
                              <div className='text-xs text-slate-600 dark:text-slate-400'>
                                {format.description} - <code>{format.example}</code>
                              </div>
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value='examples' className='space-y-6'>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6'>
                <Card className={isDark ? 'bg-slate-800 border-slate-700' : 'bg-white'}>
                  <CardHeader>
                    <CardTitle>JavaScript</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className='bg-slate-100 dark:bg-slate-700 p-3 rounded text-sm font-mono sm:overflow-visible overflow-x-auto'>
                      <pre className='sm:whitespace-pre-wrap sm:break-words whitespace-pre text-xs sm:text-sm'>{`// Basic conversion
const response = await fetch('${buildApiUrl('api/convert')}?timestamp=1640995200');
const data = await response.json();
console.log(data.data.utc);

// With timezone
const response2 = await fetch('${buildApiUrl('api/convert')}?timestamp=1640995200&targetTimezone=America/New_York');
const data2 = await response2.json();
console.log(data2.data.formats.local);`}</pre>
                    </div>
                  </CardContent>
                </Card>

                <Card className={isDark ? 'bg-slate-800 border-slate-700' : 'bg-white'}>
                  <CardHeader>
                    <CardTitle>Python</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className='bg-slate-100 dark:bg-slate-700 p-3 rounded text-sm font-mono sm:overflow-visible overflow-x-auto'>
                      <pre className='sm:whitespace-pre-wrap sm:break-words whitespace-pre text-xs sm:text-sm'>{`import requests

# Convert timestamp
response = requests.get('/api/convert', params={
    'timestamp': 1640995200,
    'targetTimezone': 'Asia/Tokyo'
})
data = response.json()
print(data['data']['formats']['local'])`}</pre>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value='monitoring' className='space-y-6'>
              <Card className={isDark ? 'bg-slate-800 border-slate-700' : 'bg-white'}>
                <CardHeader>
                  <CardTitle>System Health</CardTitle>
                  <p className='text-sm text-slate-600 dark:text-slate-400'>
                    Monitor API performance and availability
                  </p>
                </CardHeader>
                <CardContent>
                  <div className='space-y-4'>
                    <div className='flex justify-between items-center p-3 bg-slate-100 dark:bg-slate-700 rounded'>
                      <span>Health Check</span>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() => {
                          // Use health endpoint as API root since /api is intercepted by frontend routing
                          window.open(buildApiUrl('api/health'), '_blank');
                        }}
                      >
                        API Health
                      </Button>
                    </div>

                    <div className='text-sm space-y-2'>
                      <div className='flex justify-between'>
                        <span>Rate Limit:</span>
                        <span>100 requests/minute</span>
                      </div>
                      <div className='flex justify-between'>
                        <span>Cache TTL:</span>
                        <span>5-24 hours</span>
                      </div>
                      <div className='flex justify-between'>
                        <span>Supported Timezones:</span>
                        <span>{timezones.length} zones</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Quick Links */}
          <div className='mt-8 grid grid-cols-1 md:grid-cols-3 gap-4'>
            <Card className={isDark ? 'bg-slate-800 border-slate-700' : 'bg-white'}>
              <CardHeader>
                <CardTitle className='text-lg'>{t.api.quickStart}</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className='text-sm space-y-2 list-decimal list-inside'>
                  <li>Choose an endpoint</li>
                  <li>Add your parameters</li>
                  <li>Make the request</li>
                  <li>Process the response</li>
                </ol>
              </CardContent>
            </Card>

            <Card className={isDark ? 'bg-slate-800 border-slate-700' : 'bg-white'}>
              <CardHeader>
                <CardTitle className='text-lg'>{t.api.bestPractices}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className='text-sm space-y-2 list-disc list-inside'>
                  <li>Use ISO format for dates</li>
                  <li>Cache responses locally</li>
                  <li>Handle rate limits gracefully</li>
                  <li>Validate inputs client-side</li>
                </ul>
              </CardContent>
            </Card>

            <Card className={isDark ? 'bg-slate-800 border-slate-700' : 'bg-white'}>
              <CardHeader>
                <CardTitle className='text-lg'>{t.api.support}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className='text-sm space-y-2'>
                  <div>
                    Check <code>/api/health</code> for status
                  </div>
                  <div>Review error messages</div>
                  <div>Test with the console above</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default EnhancedApiDocs;
