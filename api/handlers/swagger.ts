import { VercelRequest, VercelResponse } from '@vercel/node';
import { withCors } from '../utils/response';
import fs from 'fs';
import path from 'path';

/**
 * Serves the Swagger UI HTML page for API documentation
 */
async function swaggerHandler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Serve HTML for Swagger UI
    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Timestamp Converter API Documentation</title>
      <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@4.5.0/swagger-ui.css" />
      <link rel="icon" type="image/png" href="https://tsconv.com/favicon.ico" />
      <style>
        html {
          box-sizing: border-box;
          overflow: -moz-scrollbars-vertical;
          overflow-y: scroll;
        }
        
        *,
        *:before,
        *:after {
          box-sizing: inherit;
        }
        
        body {
          margin: 0;
          background: #fafafa;
        }
        
        .swagger-ui .topbar {
          background-color: #24292e;
        }
        
        .swagger-ui .info .title {
          color: #24292e;
        }
        
        .swagger-ui .opblock.opblock-get {
          background: rgba(97, 175, 254, 0.1);
          border-color: #61affe;
        }
        
        .swagger-ui .opblock.opblock-post {
          background: rgba(73, 204, 144, 0.1);
          border-color: #49cc90;
        }
      </style>
    </head>
    <body>
      <div id="swagger-ui"></div>
      <script src="https://unpkg.com/swagger-ui-dist@4.5.0/swagger-ui-bundle.js"></script>
      <script src="https://unpkg.com/swagger-ui-dist@4.5.0/swagger-ui-standalone-preset.js"></script>
      <script>
        window.onload = function() {
          const ui = SwaggerUIBundle({
            url: "/api/openapi.json",
            dom_id: '#swagger-ui',
            deepLinking: true,
            presets: [
              SwaggerUIBundle.presets.apis,
              SwaggerUIStandalonePreset
            ],
            plugins: [
              SwaggerUIBundle.plugins.DownloadUrl
            ],
            layout: "StandaloneLayout",
            tagsSorter: "alpha",
            operationsSorter: "alpha",
            docExpansion: "list"
          });
          window.ui = ui;
        };
      </script>
    </body>
    </html>
    `;

    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(html);
  } catch (error) {
    console.error('Swagger UI error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to serve Swagger UI',
      },
    });
  }
}

/**
 * Serves the OpenAPI specification JSON file
 */
async function openApiHandler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // In production, read from the file system
    const openApiPath = path.join(process.cwd(), 'api', 'openapi.json');

    if (fs.existsSync(openApiPath)) {
      const openApiSpec = fs.readFileSync(openApiPath, 'utf8');
      res.setHeader('Content-Type', 'application/json');
      res.status(200).send(openApiSpec);
    } else {
      // Fallback to embedded spec if file doesn't exist
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'OpenAPI specification not found',
        },
      });
    }
  } catch (error) {
    console.error('OpenAPI spec error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to serve OpenAPI specification',
      },
    });
  }
}

// Export handlers with CORS support
export const swaggerUiHandler = async (req: VercelRequest, res: VercelResponse) => {
  withCors(res);
  return swaggerHandler(req, res);
};

export const openApiJsonHandler = async (req: VercelRequest, res: VercelResponse) => {
  withCors(res);
  return openApiHandler(req, res);
};

// Default export for /api/swagger
export default swaggerUiHandler;
