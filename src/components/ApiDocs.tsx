import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";
// import Header from "./Header";

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
    <div className={`relative rounded-lg ${isDark ? 'bg-slate-800' : 'bg-slate-50'} overflow-x-auto`}>
      <div className="flex justify-between items-start gap-3 p-3 sm:p-4">
        <pre className="flex-1 text-sm overflow-x-auto">
          <code className={`language-${language}`}>{code}</code>
        </pre>
        <button
          onClick={() => copyToClipboard(code, copyKey)}
          className={`flex-shrink-0 p-1 rounded transition-colors ${
            isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'
          }`}
        >
          {copiedStates[copyKey] ? (
            <Check className="w-4 h-4 text-green-500" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen transition-colors duration-200 ${
      isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'
    }`}>
      {/* <Header currentPage="api" /> */}
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-8">API Documentation</h1>
        <p className="text-base sm:text-lg mb-8 text-slate-600 dark:text-slate-400">
          Convert timestamps programmatically with our simple REST API.
        </p>
        
        {/* Base URL */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Base URL</h2>
          <CodeBlock 
            code="https://api.tsconv.com" 
            copyKey="baseUrl"
          />
        </section>

        {/* API Endpoints */}
        <div className="space-y-8">
          {/* Convert Timestamp to Date */}
          <section>
            <h2 className="text-xl font-semibold mb-4">Convert Timestamp to Date</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              Convert a Unix timestamp to human-readable date formats.
            </p>
            
            <div className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">Request</h3>
                <CodeBlock 
                  code="GET /api/convert?timestamp=1640995200" 
                  copyKey="endpoint1"
                />
              </div>

              <div>
                <h3 className="font-medium mb-2">Parameters</h3>
                <div className={`p-4 rounded-lg ${isDark ? 'bg-slate-800' : 'bg-slate-50'}`}>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className={`border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                        <th className="text-left py-2">Parameter</th>
                        <th className="text-left py-2">Type</th>
                        <th className="text-left py-2">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="py-2 font-mono">timestamp</td>
                        <td className="py-2">integer</td>
                        <td className="py-2">Unix timestamp (seconds since epoch)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h3 className="font-medium mb-2">Response</h3>
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

              <div>
                <h3 className="font-medium mb-2">Example</h3>
                <CodeBlock 
                  code={`curl -X GET "https://api.tsconv.com/api/convert?timestamp=1640995200"`}
                  copyKey="example1"
                />
              </div>
            </div>
          </section>

          {/* Convert Date to Timestamp */}
          <section>
            <h2 className="text-xl font-semibold mb-4">Convert Date to Timestamp</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              Convert a date string to Unix timestamp.
            </p>
            
            <div className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">Request</h3>
                <CodeBlock 
                  code="GET /api/convert?date=2022-01-01" 
                  copyKey="endpoint2"
                />
              </div>

              <div>
                <h3 className="font-medium mb-2">Parameters</h3>
                <div className={`p-4 rounded-lg ${isDark ? 'bg-slate-800' : 'bg-slate-50'}`}>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className={`border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                        <th className="text-left py-2">Parameter</th>
                        <th className="text-left py-2">Type</th>
                        <th className="text-left py-2">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="py-2 font-mono">date</td>
                        <td className="py-2">string</td>
                        <td className="py-2">Date string (ISO 8601 format recommended)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h3 className="font-medium mb-2">Response</h3>
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
                <h3 className="font-medium mb-2">Example</h3>
                <CodeBlock 
                  code={`curl -X GET "https://api.tsconv.com/api/convert?date=2022-01-01"`}
                  copyKey="example2"
                />
              </div>
            </div>
          </section>

          {/* Current Timestamp */}
          <section>
            <h2 className="text-xl font-semibold mb-4">Get Current Timestamp</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              Get the current Unix timestamp.
            </p>
            
            <div className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">Request</h3>
                <CodeBlock 
                  code="GET /api/now" 
                  copyKey="endpoint3"
                />
              </div>

              <div>
                <h3 className="font-medium mb-2">Response</h3>
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
                <h3 className="font-medium mb-2">Example</h3>
                <CodeBlock 
                  code={`curl -X GET "https://api.tsconv.com/api/now"`}
                  copyKey="example3"
                />
              </div>
            </div>
          </section>

          {/* Error Responses */}
          <section>
            <h2 className="text-xl font-semibold mb-4">Error Responses</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
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
              <h3 className="font-medium mb-2">Common Error Codes</h3>
              <div className={`p-4 rounded-lg ${isDark ? 'bg-slate-800' : 'bg-slate-50'}`}>
                <table className="w-full text-sm">
                  <thead>
                    <tr className={`border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                      <th className="text-left py-2">Code</th>
                      <th className="text-left py-2">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className={`border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                      <td className="py-2 font-mono">INVALID_TIMESTAMP</td>
                      <td className="py-2">The timestamp parameter is invalid</td>
                    </tr>
                    <tr className={`border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                      <td className="py-2 font-mono">INVALID_DATE</td>
                      <td className="py-2">The date parameter cannot be parsed</td>
                    </tr>
                    <tr className={`border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                      <td className="py-2 font-mono">MISSING_PARAMETER</td>
                      <td className="py-2">Required parameter is missing</td>
                    </tr>
                    <tr>
                      <td className="py-2 font-mono">RATE_LIMIT_EXCEEDED</td>
                      <td className="py-2">Too many requests, please slow down</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Rate Limiting */}
          <section>
            <h2 className="text-xl font-semibold mb-4">Rate Limiting</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
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
            <h2 className="text-xl font-semibold mb-4">Code Examples</h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="font-medium mb-2">JavaScript</h3>
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
                <h3 className="font-medium mb-2">Python</h3>
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
                <h3 className="font-medium mb-2">PHP</h3>
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
  );
}
