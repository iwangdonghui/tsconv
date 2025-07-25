import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { translations } from '../utils/translations';
import { mockFormatService } from '../utils/services';
import { mockTimezoneService } from '../utils/services';
import { SEO } from './SEO';
import Header from './Header';
import Footer from './Footer';

const EnhancedApiDocs = () => {
  const { isDark } = useTheme();
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedEndpoint, setSelectedEndpoint] = useState('convert');
  const [testingData, setTestingData] = useState({
    timestamp: '',
    date: '',
    format: 'iso8601',
    timezone: 'UTC',
    targetTimezone: 'UTC'
  });

  const t = translations[language];

  const endpoints = [
    {
      id: 'convert',
      name: 'Convert',
      method: 'GET',
      path: '/api/convert',
      description: t.api.convertDescription,
      example: 'https://tsconv.com/api/convert?timestamp=1640995200'
    },
    {
      id: 'batch',
      name: 'Batch',
      method: 'POST',
      path: '/api/enhanced-batch',
      description: 'Convert multiple timestamps/dates in a single request',
      example: 'https://tsconv.com/api/enhanced-batch'
    },
    {
      id: 'timezone',
      name: 'Timezone',
      method: 'GET',
      path: '/api/timezone-difference',
      description: 'Calculate timezone differences and conversions',
      example: 'https://tsconv.com/api/timezone-difference?from=UTC&to=America/New_York'
    },
    {
      id: 'formats',
      name: 'Formats',
      method: 'GET',
      path: '/api/formats',
      description: 'Discover and use custom date/time formats',
      example: 'https://tsconv.com/api/formats'
    },
    {
      id: 'visualization',
      name: 'Visualization',
      method: 'GET',
      path: '/api/visualization',
      description: 'Generate charts and visualization data',
      example: 'https://tsconv.com/api/visualization?type=timezone-chart'
    },
    {
      id: 'health',
      name: 'Health',
      method: 'GET',
      path: '/api/health',
      description: 'Monitor system health and performance',
      example: 'https://tsconv.com/api/health'
    }
  ];

  const formats = mockFormatService.listFormats();
  const timezones = mockTimezoneService.getCommonTimezones();

  return (
    <div className={`min-h-screen transition-colors duration-200 ${
      isDark ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-900'
    }`}>
      <SEO
        title="API Documentation - Timestamp Converter | tsconv.com"
        description="Complete API documentation for tsconv.com timestamp conversion service. Convert Unix timestamps, handle timezones, batch processing, and more."
        canonical="https://tsconv.com/api"
        ogTitle="API Documentation - Timestamp Converter"
        ogDescription="Complete API documentation for tsconv.com timestamp conversion service. Convert Unix timestamps, handle timezones, batch processing, and more."
        keywords="timestamp API, unix timestamp API, date conversion API, timezone API, batch conversion API"
      />
      <Header />
      <main className="flex-grow">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">{t.api.title}</h1>
            <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              {t.api.subtitle}
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-3 lg:grid-cols-6 mb-8">
              <TabsTrigger value="overview">{t.api.overview}</TabsTrigger>
              <TabsTrigger value="endpoints">{t.api.endpoints}</TabsTrigger>
              <TabsTrigger value="testing">{t.api.testing}</TabsTrigger>
              <TabsTrigger value="formats">{t.api.formats}</TabsTrigger>
              <TabsTrigger value="examples">{t.api.examples}</TabsTrigger>
              <TabsTrigger value="monitoring">{t.api.monitoring}</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {endpoints.map((endpoint) => (
                  <Card key={endpoint.id} className={isDark ? 'bg-slate-800 border-slate-700' : 'bg-white'}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{endpoint.name}</CardTitle>
                        <Badge variant={endpoint.method === 'GET' ? 'default' : 'secondary'}>
                          {endpoint.method}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">{endpoint.path}</p>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm mb-4">{endpoint.description}</p>
                      <div className="text-xs bg-slate-100 dark:bg-slate-700 p-2 rounded font-mono overflow-x-auto">
                        {endpoint.example}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="endpoints" className="space-y-6">
              <div className="space-y-6">
                {endpoints.map((endpoint) => (
                  <Card key={endpoint.id} className={isDark ? 'bg-slate-800 border-slate-700' : 'bg-white'}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>{endpoint.name}</CardTitle>
                        <div className="flex gap-2">
                          <Badge variant={endpoint.method === 'GET' ? 'default' : 'secondary'}>
                            {endpoint.method}
                          </Badge>
                          <Badge variant="outline">{endpoint.path}</Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="mb-4">{endpoint.description}</p>
                      
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-semibold mb-2">Parameters</h4>
                          <div className="bg-slate-100 dark:bg-slate-700 p-3 rounded text-sm">
                            <code>{endpoint.example}</code>
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="font-semibold mb-2">Response Example</h4>
                          <div className="bg-slate-100 dark:bg-slate-700 p-3 rounded text-xs font-mono overflow-x-auto">
                            <pre>{JSON.stringify({
                              success: true,
                              data: { timestamp: 1640995200, utc: "Sat, 01 Jan 2022 00:00:00 GMT" },
                              metadata: { processingTime: 25 }
                            }, null, 2)}</pre>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="testing" className="space-y-6">
              <Card className={isDark ? 'bg-slate-800 border-slate-700' : 'bg-white'}>
                <CardHeader>
                  <CardTitle>API Testing Console</CardTitle>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Test the API endpoints directly from your browser
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Timestamp</label>
                        <Input
                          type="number"
                          placeholder="1640995200"
                          value={testingData.timestamp}
                          onChange={(e) => setTestingData(prev => ({ ...prev, timestamp: e.target.value }))}
                          className={isDark ? 'bg-slate-700 border-slate-600' : ''}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Date</label>
                        <Input
                          type="text"
                          placeholder="2022-01-01"
                          value={testingData.date}
                          onChange={(e) => setTestingData(prev => ({ ...prev, date: e.target.value }))}
                          className={isDark ? 'bg-slate-700 border-slate-600' : ''}
                        />
                      </div>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Source Timezone</label>
                        <Select 
                          value={testingData.timezone} 
                          onValueChange={(value) => setTestingData(prev => ({ ...prev, timezone: value }))}
                        >
                          <SelectTrigger className={isDark ? 'bg-slate-700 border-slate-600' : ''}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className={isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-300'}>
                            {timezones.slice(0, 10).map((tz: any) => (
                              <SelectItem key={tz.identifier} value={tz.identifier} className={isDark ? 'text-white hover:bg-slate-700' : 'text-gray-900 hover:bg-gray-100'}>
                                {tz.displayName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Target Timezone</label>
                        <Select 
                          value={testingData.targetTimezone} 
                          onValueChange={(value) => setTestingData(prev => ({ ...prev, targetTimezone: value }))}
                        >
                          <SelectTrigger className={isDark ? 'bg-slate-700 border-slate-600' : ''}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className={isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-300'}>
                            {timezones.slice(0, 10).map((tz: any) => (
                              <SelectItem key={tz.identifier} value={tz.identifier} className={isDark ? 'text-white hover:bg-slate-700' : 'text-gray-900 hover:bg-gray-100'}>
                                {tz.displayName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">Output Format</label>
                      <Select 
                        value={testingData.format} 
                        onValueChange={(value) => setTestingData(prev => ({ ...prev, format: value }))}
                      >
                        <SelectTrigger className={isDark ? 'bg-slate-700 border-slate-600' : ''}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className={isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-300'}>
                          {formats.slice(0, 8).map((format: any) => (
                            <SelectItem key={format.name} value={format.name.toLowerCase()} className={isDark ? 'text-white hover:bg-slate-700' : 'text-gray-900 hover:bg-gray-100'}>
                              {format.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <Button 
                      className="w-full" 
                      onClick={() => {
                        const baseUrl = window.location.origin;
                        const url = testingData.timestamp 
                          ? `${baseUrl}/api/convert?timestamp=${testingData.timestamp}`
                          : `${baseUrl}/api/convert?date=${testingData.date}`;
                        window.open(url, '_blank');
                      }}
                    >
                      Test API
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="formats" className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                {['standard', 'human', 'regional', 'technical'].map(category => (
                  <Card key={category} className={isDark ? 'bg-slate-800 border-slate-700' : 'bg-white'}>
                    <CardHeader>
                      <CardTitle className="capitalize">{category} Formats</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {formats.filter((f: any) => f.category === category).map((format: any) => (
                          <div key={format.name} className="text-sm">
                            <div className="font-medium">{format.name}</div>
                            <div className="text-xs text-slate-600 dark:text-slate-400">
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

            <TabsContent value="examples" className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <Card className={isDark ? 'bg-slate-800 border-slate-700' : 'bg-white'}>
                  <CardHeader>
                    <CardTitle>JavaScript</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-slate-100 dark:bg-slate-700 p-3 rounded text-sm font-mono overflow-x-auto">
                      <pre>{`// Basic conversion
const response = await fetch('/api/convert?timestamp=1640995200');
const data = await response.json();
console.log(data.data.utc);

// With timezone
const response2 = await fetch('/api/convert?timestamp=1640995200&targetTimezone=America/New_York');
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
                    <div className="bg-slate-100 dark:bg-slate-700 p-3 rounded text-sm font-mono overflow-x-auto">
                      <pre>{`import requests

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

            <TabsContent value="monitoring" className="space-y-6">
              <Card className={isDark ? 'bg-slate-800 border-slate-700' : 'bg-white'}>
                <CardHeader>
                  <CardTitle>System Health</CardTitle>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Monitor API performance and availability
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-slate-100 dark:bg-slate-700 rounded">
                      <span>Health Check</span>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => window.open('/api', '_blank')}
                      >
                        API Root
                      </Button>
                    </div>
                    
                    <div className="text-sm space-y-2">
                      <div className="flex justify-between">
                        <span>Rate Limit:</span>
                        <span>100 requests/minute</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Cache TTL:</span>
                        <span>5-24 hours</span>
                      </div>
                      <div className="flex justify-between">
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
          <div className="mt-8 grid md:grid-cols-3 gap-4">
            <Card className={isDark ? 'bg-slate-800 border-slate-700' : 'bg-white'}>
              <CardHeader>
                <CardTitle className="text-lg">{t.api.quickStart}</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="text-sm space-y-2 list-decimal list-inside">
                  <li>Choose an endpoint</li>
                  <li>Add your parameters</li>
                  <li>Make the request</li>
                  <li>Process the response</li>
                </ol>
              </CardContent>
            </Card>

            <Card className={isDark ? 'bg-slate-800 border-slate-700' : 'bg-white'}>
              <CardHeader>
                <CardTitle className="text-lg">{t.api.bestPractices}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-sm space-y-2 list-disc list-inside">
                  <li>Use ISO format for dates</li>
                  <li>Cache responses locally</li>
                  <li>Handle rate limits gracefully</li>
                  <li>Validate inputs client-side</li>
                </ul>
              </CardContent>
            </Card>

            <Card className={isDark ? 'bg-slate-800 border-slate-700' : 'bg-white'}>
              <CardHeader>
                <CardTitle className="text-lg">{t.api.support}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm space-y-2">
                  <div>Check <code>/api/health</code> for status</div>
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