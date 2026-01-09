/**
 * OpenAPI Documentation Endpoint
 *
 * Serves the OpenAPI/Swagger specification file
 * Access at: GET /api/docs/openapi
 */

import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'docs', 'openapi.yaml');
    const content = fs.readFileSync(filePath, 'utf-8');

    return new NextResponse(content, {
      headers: {
        'Content-Type': 'application/yaml',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'OpenAPI specification not found' },
      { status: 404 }
    );
  }
}
