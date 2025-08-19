# 🕐 tsconv.com - Timestamp Converter

A fast, simple, and accurate Unix timestamp conversion tool built for
developers. Convert between Unix timestamps and human-readable dates with
real-time results and multiple format support.

![tsconv.com](./public/tsconv_logo.png)

## ✨ Features

- **🚀 Real-time Conversion**: Instant conversion as you type
- **🔄 Bidirectional**: Convert Unix timestamps to dates and vice versa
- **🌍 Multiple Formats**: Support for various date formats and timezones
- **📱 Responsive Design**: Works perfectly on desktop and mobile
- **🌙 Dark Mode**: Toggle between light and dark themes
- **📋 Copy to Clipboard**: One-click copy for all results
- **⚡ Live Timestamp**: Real-time current Unix timestamp display
- **📚 API Documentation**: Complete REST API for developers
- **📖 Developer Guide**: Comprehensive guides and examples

## 🎯 Use Cases

- **Backend Development**: Convert database timestamps
- **API Testing**: Work with timestamp-based APIs
- **Log Analysis**: Parse server logs with timestamps
- **Data Migration**: Convert between different time formats
- **Debugging**: Understand timestamp values in applications

## 🚀 Quick Start

### Online Tool

Visit [tsconv.com](https://tsconv.com) to use the tool directly in your browser.

### Local Development

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/tsconv.git
   cd tsconv
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Start development server**

   ```bash
   npm run dev
   ```

4. **Open in browser**
   ```
   http://localhost:5173
   ```

## 🌐 Deployment

### Cloudflare Pages (Recommended - Frontend + Functions)

1. Functions 目录：`functions/`（已内置 /api/\* 路由）
2. 生产 API 基址：内置为 `/api`（无需额外配置）
3. 构建命令：`npm run build`
4. 输出目录：`dist`
5. 重新部署时勾选：`Clear build cache`

提示：如果使用 Sentry，请在 `public/_headers` 的 `connect-src`
放行你的 DSN 域名。

### Quick Fix for Cloudflare Blank Pages

If you encounter blank pages on Cloudflare deployment:

```bash
./scripts/fix-cloudflare-deployment.sh
```

📖 **Detailed Instructions**: See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Date Handling**: Native JavaScript Date API
- **API**: Cloudflare Pages Functions (/api)
- **Deployment**: Cloudflare Pages

## 📖 Usage Examples

### Basic Conversion

```
Input: 1640995200
Output: Sat, 01 Jan 2022 00:00:00 GMT
```

### Date to Timestamp

```
Input: 2022-01-01
Output: 1640995200
```

### Multiple Formats

- ISO 8601: `2022-01-01T00:00:00.000Z`
- RFC 2822: `Sat, 01 Jan 2022 00:00:00 GMT`
- Local Time: `1/1/2022, 12:00:00 AM`
- Relative: `2 years ago`

## 🔧 API Usage

### Base URL

```
https://api.tsconv.com
```

### API Documentation

We provide comprehensive API documentation:

- **API Documentation**: [API_DOCUMENTATION.md](API_DOCUMENTATION.md)
- **Detailed Examples**: [API_EXAMPLES_DETAILED.md](API_EXAMPLES_DETAILED.md)
- **Error Codes**: [API_ERROR_CODES.md](API_ERROR_CODES.md)
- **Interactive Swagger UI**: [/api/swagger](/api/swagger)
- **OpenAPI Specification**: [/api/openapi.json](/api/openapi.json)

### Get Current Timestamp

```bash
curl https://api.tsconv.com/now
```

**Response:**

```json
{
  "success": true,
  "data": {
    "timestamp": 1640995200,
    "utc": "Sat, 01 Jan 2022 00:00:00 GMT",
    "iso8601": "2022-01-01T00:00:00.000Z"
  }
}
```

### Convert Timestamp to Date

```bash
curl "https://api.tsconv.com/convert?timestamp=1640995200"
```

**Response:**

```json
{
  "success": true,
  "data": {
    "timestamp": 1640995200,
    "utc": "Sat, 01 Jan 2022 00:00:00 GMT",
    "iso8601": "2022-01-01T00:00:00.000Z",
    "relative": "2 years ago"
  }
}
```

### Convert Date to Timestamp

```bash
curl "https://api.tsconv.com/convert?date=2022-01-01"
```

**Response:**

```json
{
  "success": true,
  "data": {
    "date": "2022-01-01",
    "timestamp": 1640995200,
    "utc": "Sat, 01 Jan 2022 00:00:00 GMT",
    "iso8601": "2022-01-01T00:00:00.000Z"
  }
}
```

## 📁 Project Structure

```
tsconv/
├── functions/               # Cloudflare Pages Functions (/api/*)
│   ├── api/
│   │   ├── format/
│   │   │   ├── index.ts
│   │   │   └── templates.ts
│   │   ├── date-diff.ts
│   │   ├── timezones.ts
│   │   ├── workdays.ts
│   │   └── health.ts
├── public/
│   ├── tsconv_logo.png
│   └── favicon.ico
├── src/
│   ├── components/
│   │   ├── TimestampConverter.tsx
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   ├── ApiDocs.tsx
│   │   └── Guide.tsx
│   ├── contexts/
│   │   └── ThemeContext.tsx
│   ├── utils/
│   │   └── timestampUtils.ts
│   ├── main.tsx
│   └── App.tsx
├── index.html
├── package.json
├── tailwind.config.js
├── tsconfig.json
├── vite.config.ts
└── wrangler.toml            # Cloudflare configuration
```

## 🎨 Features Overview

### Converter Page

- Real-time timestamp conversion
- Multiple output formats
- Copy to clipboard functionality
- Input validation and error handling

### API Documentation

- Complete REST API reference
- Request/response examples
- CORS support for cross-origin requests
- Error handling with detailed messages

### Developer Guide

- Common use cases and examples
- Best practices for timestamp handling
- Integration guides for popular frameworks
- Troubleshooting tips

## 🌙 Theme Support

The application supports both light and dark themes with:

- System preference detection
- Manual theme toggle
- Persistent theme selection
- Smooth transitions

## 📱 Responsive Design

Optimized for all screen sizes:

- **Mobile**: Touch-friendly interface
- **Tablet**: Optimized layout
- **Desktop**: Full feature set
- **Large Screens**: Enhanced spacing

## 🚀 Deployment

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

### Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### Environment Variables

No environment variables required for basic functionality.

## 🔧 API Configuration

The API is configured to work with the custom domain `api.tsconv.com`. The
configuration includes:

- **CORS Headers**: Enabled for cross-origin requests
- **Error Handling**: Comprehensive error responses
- **TypeScript**: Full type safety with Vercel functions
- **Rate Limiting**: Handled by Vercel's infrastructure

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md)
for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file
for details.

## 🙏 Acknowledgments

- Built with [React](https://reactjs.org/) and [Vite](https://vitejs.dev/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
- Icons by [Lucide](https://lucide.dev/)
- API powered by Cloudflare Pages Functions
- Inspired by the developer community's need for simple, reliable tools

## 📞 Support

- **Website**: [tsconv.com](https://tsconv.com)
- **API**: [api.tsconv.com](https://api.tsconv.com)
- **Issues**: [GitHub Issues](https://github.com/yourusername/tsconv/issues)
- **Email**: support@tsconv.com

---

Made with ❤️ for the developer community
