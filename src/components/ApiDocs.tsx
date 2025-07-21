import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";
import Header from "./Header";
import Footer from "./Footer";

export default function ApiDocs() {
  const [copiedStates, setCopiedStates] = useState<{[key: string]: boolean}>({});
  const { isDark } = useTheme();

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedStates(prev => ({ ...prev, [key]: true }));
      setTimeout(() => {
        setCopiedStates(prev => ({ ...prev, [key]: false }));
      }, 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  const CodeBlock = ({ code, language = "bash", copyKey }: { code: string; language?: string; copyKey: string }) => (
    <div className={`relative rounded-lg ${isDark ? 'bg-slate-800' : 'bg-slate-50'} overflow-hidden`}>
      <div className="flex items-start gap-2 p-2 sm:p-3">
        <div className="flex-1 min-w-0 overflow-x-auto">
          <pre className="text-xs sm:text-sm whitespace-pre-wrap break-all sm:break-normal">
            <code className={`language-${language}`}>{code}</code>
          </pre>
        </div>
        <button
          onClick={() => copyToClipboard(code, copyKey)}
          className={`flex-shrink-0 p-1 rounded transition-colors ${
            isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'
          }`}
          title="Copy to clipboard"
        >
          {copiedStates[copyKey] ? (
            <Check className="w-3 h-3 text-green-500" />
          ) : (
            <Copy className="w-3 h-3" />
          )}
        </button>
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-200 ${
      isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'
    }`}>
      <Header />
      
      <div className="flex-1 w-full max-w-4xl mx-auto px-3 sm:px-6 py-6 sm:py-12">
        <div className="w-full max-w-none">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-4 sm:mb-8 break-words">API Documentation</h1>
          
          {/* Base URL */}
          <section className="mb-6 sm:mb-8 w-full">
            <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Base URL</h2>
            <div className="w-full overflow-hidden">
              <CodeBlock 
                code="https://api.tsconv.com" 
                copyKey="baseUrl"
              />
            </div>
          </section>

          {/* API Endpoints */}
          <div className="space-y-6 sm:space-y-8 w-full">
            {/* Convert Timestamp to Date */}
            <section className="w-full">
              <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Convert Timestamp to Date</h2>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mb-4">
                Convert a Unix timestamp to human-readable date formats.
              </p>
              
              <div className="space-y-3 sm:space-y-4 w-full">
                <div className="w-full">
                  <h3 className="font-medium mb-2 text-sm sm:text-base">Request</h3>
                  <div className="w-full overflow-hidden">
                    <CodeBlock 
                      code="GET /api/convert?timestamp=1640995200" 
                      copyKey="endpoint1"
                    />
                  </div>
                </div>

                <div className="w-full">
                  <h3 className="font-medium mb-2 text-sm sm:text-base">Parameters</h3>
                  <div className={`w-full overflow-x-auto rounded-lg ${isDark ? 'bg-slate-800' : 'bg-slate-50'}`}>
                    <div className="p-2 sm:p-3 min-w-[280px]">
                      <table className="w-full text-xs sm:text-sm">
                        <thead>
                          <tr className={`border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                            <th className="text-left py-1 pr-2 sm:py-2 sm:pr-4">Parameter</th>
                            <th className="text-left py-1 pr-2 sm:py-2 sm:pr-4">Type</th>
                            <th className="text-left py-1 sm:py-2">Description</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="py-1 pr-2 sm:py-2 sm:pr-4 font-mono text-xs">timestamp</td>
                            <td className="py-1 pr-2 sm:py-2 sm:pr-4 text-xs">integer</td>
                            <td className="py-1 sm:py-2 text-xs">Unix timestamp (seconds)</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <div className="w-full">
                  <h3 className="font-medium mb-2 text-sm sm:text-base">Response</h3>
                  <div className="w-full overflow-hidden">
                    <CodeBlock 
                      code={`{
  "success": true,
  "data": {
    "timestamp": 1640995200,
    "utc": "Sat, 01 Jan 2022 00:00:00 GMT",
    "local": "Saturday, January 1, 2022 at 8:00:00 AM CST",
    "iso8601": "2022-01-01T00:00:00.000Z",
    "relative": "2 years ago"
  }
}`}
                      language="json"
                      copyKey="response1"
                    />
                  </div>
                </div>

                <div className="w-full">
                  <h3 className="font-medium mb-2 text-sm sm:text-base">Example</h3>
                  <div className="w-full overflow-hidden">
                    <CodeBlock 
                      code={`curl -X GET "https://api.tsconv.com/api/convert?timestamp=1640995200"`}
                      copyKey="example1"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Convert Date to Timestamp */}
            <section>
              <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Convert Date to Timestamp</h2>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mb-4">
                Convert a date string to Unix timestamp.
              </p>
              
              <div className="space-y-3 sm:space-y-4">
                <div>
                  <h3 className="font-medium mb-2 text-sm sm:text-base">Request</h3>
                  <CodeBlock 
                    code="GET /api/convert?date=2022-01-01" 
                    copyKey="endpoint2"
                  />
                </div>

                <div>
                  <h3 className="font-medium mb-2 text-sm sm:text-base">Parameters</h3>
                  <div className={`p-3 sm:p-4 rounded-lg overflow-x-auto ${isDark ? 'bg-slate-800' : 'bg-slate-50'}`}>
                    <table className="w-full text-xs sm:text-sm min-w-[300px]">
                      <thead>
                        <tr className={`border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                          <th className="text-left py-2 pr-4">Parameter</th>
                          <th className="text-left py-2 pr-4">Type</th>
                          <th className="text-left py-2">Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="py-2 pr-4 font-mono">date</td>
                          <td className="py-2 pr-4">string</td>
                          <td className="py-2">Date string (ISO 8601 format recommended)</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium mb-2 text-sm sm:text-base">Response</h3>
                  <CodeBlock 
                    code={`{
  "success": true,
  "data": {
    "date": "2022-01-01",
    "timestamp": 1640995200,
    "utc": "Sat, 01 Jan 2022 00:00:00 GMT",
    "iso8601": "2022-01-01T00:00:00.000Z"
  }
}`}
                    language="json"
                    copyKey="response2"
                  />
                </div>

                <div>
                  <h3 className="font-medium mb-2 text-sm sm:text-base">Example</h3>
                  <CodeBlock 
                    code={`curl -X GET "https://api.tsconv.com/api/convert?date=2022-01-01"`}
                    copyKey="example2"
                  />
                </div>
              </div>
            </section>

            {/* Current Timestamp */}
            <section>
              <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Get Current Timestamp</h2>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mb-4">
                Get the current Unix timestamp.
              </p>
              
              <div className="space-y-3 sm:space-y-4">
                <div>
                  <h3 className="font-medium mb-2 text-sm sm:text-base">Request</h3>
                  <CodeBlock 
                    code="GET /api/now" 
                    copyKey="endpoint3"
                  />
                </div>

                <div>
                  <h3 className="font-medium mb-2 text-sm sm:text-base">Response</h3>
                  <CodeBlock 
                    code={`{
  "success": true,
  "data": {
    "timestamp": ${Math.floor(Date.now() / 1000)},
    "utc": "${new Date().toUTCString()}",
    "iso8601": "${new Date().toISOString()}"
  }
}`}
                    language="json"
                    copyKey="response3"
                  />
                </div>

                <div>
                  <h3 className="font-medium mb-2 text-sm sm:text-base">Example</h3>
                  <CodeBlock 
                    code={`curl -X GET "https://api.tsconv.com/api/now"`}
                    copyKey="example3"
                  />
                </div>
              </div>
            </section>

            {/* Error Responses */}
            <section>
              <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Error Responses</h2>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mb-4">
                All error responses follow this format:
              </p>
              
              <CodeBlock 
                code={`{
  "success": false,
  "error": {
    "code": "INVALID_TIMESTAMP",
    "message": "The provided timestamp is invalid"
  }
}`}
                language="json"
                copyKey="errorResponse"
              />

              <div className="mt-4">
                <h3 className="font-medium mb-2 text-sm sm:text-base">Common Error Codes</h3>
                <div className={`p-3 sm:p-4 rounded-lg overflow-x-auto ${isDark ? 'bg-slate-800' : 'bg-slate-50'}`}>
                  <table className="w-full text-xs sm:text-sm min-w-[300px]">
                    <thead>
                      <tr className={`border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                        <th className="text-left py-2 pr-4">Code</th>
                        <th className="text-left py-2">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className={`border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                        <td className="py-2 pr-4 font-mono">INVALID_TIMESTAMP</td>
                        <td className="py-2">The timestamp parameter is invalid</td>
                      </tr>
                      <tr className={`border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                        <td className="py-2 pr-4 font-mono">INVALID_DATE</td>
                        <td className="py-2">The date parameter cannot be parsed</td>
                      </tr>
                      <tr className={`border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                        <td className="py-2 pr-4 font-mono">MISSING_PARAMETER</td>
                        <td className="py-2">Required parameter is missing</td>
                      </tr>
                      <tr>
                        <td className="py-2 pr-4 font-mono">RATE_LIMIT_EXCEEDED</td>
                        <td className="py-2">Too many requests, please slow down</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            {/* Rate Limiting */}
            <section>
              <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Rate Limiting</h2>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mb-4">
                The API is rate limited to prevent abuse:
              </p>
              <ul className="list-disc list-inside space-y-2 text-slate-600 dark:text-slate-400">
                <li>100 requests per minute per IP address</li>
                <li>Rate limit headers are included in all responses</li>
                <li>Exceeding the limit returns a 429 status code</li>
              </ul>
            </section>

            {/* Code Examples */}
            <section>
              <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Code Examples</h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="font-medium mb-2 text-sm sm:text-base">JavaScript</h3>
                  <CodeBlock 
                    code={`// Convert timestamp to date
const response = await fetch('https://api.tsconv.com/api/convert?timestamp=1640995200');
const data = await response.json();
console.log(data.data.utc);

// Convert date to timestamp
const response2 = await fetch('https://api.tsconv.com/api/convert?date=2022-01-01');
const data2 = await response2.json();
console.log(data2.data.timestamp);`}
                    language="javascript"
                    copyKey="jsExample"
                  />
                </div>

                <div>
                  <h3 className="font-medium mb-2 text-sm sm:text-base">Python</h3>
                  <CodeBlock 
                    code={`import requests

# Convert timestamp to date
response = requests.get('https://api.tsconv.com/api/convert?timestamp=1640995200')
data = response.json()
print(data['data']['utc'])

# Convert date to timestamp
response2 = requests.get('https://api.tsconv.com/api/convert?date=2022-01-01')
data2 = response2.json()
print(data2['data']['timestamp'])`}
                    language="python"
                    copyKey="pythonExample"
                  />
                </div>

                <div>
                  <h3 className="font-medium mb-2 text-sm sm:text-base">PHP</h3>
                  <CodeBlock 
                    code={`<?php
// Convert timestamp to date
$response = file_get_contents('https://api.tsconv.com/api/convert?timestamp=1640995200');
$data = json_decode($response, true);
echo $data['data']['utc'];

// Convert date to timestamp
$response2 = file_get_contents('https://api.tsconv.com/api/convert?date=2022-01-01');
$data2 = json_decode($response2, true);
echo $data2['data']['timestamp'];
?>`}
                    language="php"
                    copyKey="phpExample"
                  />
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
}
