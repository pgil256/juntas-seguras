/**
 * API Documentation Page
 *
 * Renders Swagger UI with the OpenAPI specification
 * Accessible at: /api-docs
 */

'use client';

import { useEffect, useRef } from 'react';

export default function ApiDocsPage() {
  const swaggerUIRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Dynamically load Swagger UI from CDN
    const loadSwaggerUI = async () => {
      // Add CSS
      const cssLink = document.createElement('link');
      cssLink.rel = 'stylesheet';
      cssLink.href = 'https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css';
      document.head.appendChild(cssLink);

      // Add Script
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js';
      script.onload = () => {
        // Initialize Swagger UI once script is loaded
        if (swaggerUIRef.current && (window as any).SwaggerUIBundle) {
          (window as any).SwaggerUIBundle({
            url: '/api/docs/openapi',
            dom_id: '#swagger-ui',
            presets: [
              (window as any).SwaggerUIBundle.presets.apis,
              (window as any).SwaggerUIBundle.SwaggerUIStandalonePreset,
            ],
            layout: 'BaseLayout',
            deepLinking: true,
            tryItOutEnabled: false, // Disable try it out in production
          });
        }
      };
      document.body.appendChild(script);
    };

    loadSwaggerUI();
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <div className="p-4 bg-slate-800 text-white">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-semibold">Juntas Seguras API Documentation</h1>
          <a
            href="/dashboard"
            className="text-sm text-slate-300 hover:text-white"
          >
            ← Back to App
          </a>
        </div>
      </div>
      <div id="swagger-ui" ref={swaggerUIRef} className="max-w-7xl mx-auto" />
    </div>
  );
}
