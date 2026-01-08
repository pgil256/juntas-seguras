// MongoMemoryServer configuration - must be set BEFORE importing modules
process.env.MONGOMS_SKIP_MD5_CHECK = '1';
process.env.MONGOMS_VERSION = '7.0.14';
process.env.MONGOMS_DOWNLOAD_TIMEOUT = '300000';

import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';
import { ReadableStream, TransformStream, WritableStream } from 'stream/web';

// Polyfill TextEncoder/TextDecoder for Node.js environments
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Polyfill Web Streams for Node.js environments
global.ReadableStream = ReadableStream;
global.TransformStream = TransformStream;
global.WritableStream = WritableStream;

// Polyfill Request/Response if not available (needed for some tests)
// Use getter for url to be compatible with NextRequest
if (typeof global.Request === 'undefined') {
  global.Request = class Request {
    #url;
    #method;
    #headers;
    #body;

    constructor(url, init = {}) {
      this.#url = url instanceof URL ? url.toString() : url;
      this.#method = init.method || 'GET';
      this.#headers = new Map(Object.entries(init.headers || {}));
      this.#body = init.body;
    }

    get url() { return this.#url; }
    get method() { return this.#method; }
    get headers() { return this.#headers; }
    get body() { return this.#body; }

    json() {
      return Promise.resolve(JSON.parse(this.#body));
    }
  };
  global.Response = class Response {
    constructor(body, init = {}) {
      this._body = body;
      this.status = init.status || 200;
      this.ok = this.status >= 200 && this.status < 300;
      this.headers = new Map(Object.entries(init.headers || {}));
    }
    json() {
      return Promise.resolve(typeof this._body === 'string' ? JSON.parse(this._body) : this._body);
    }
    text() {
      return Promise.resolve(typeof this._body === 'string' ? this._body : JSON.stringify(this._body));
    }
    // Static json method for NextResponse compatibility
    static json(data, init = {}) {
      return new Response(JSON.stringify(data), {
        ...init,
        headers: { 'Content-Type': 'application/json', ...init.headers }
      });
    }
  };
  global.Headers = class Headers extends Map {};
}

// Suppress mongoose warning about jsdom
process.env.SUPPRESS_JEST_WARNINGS = 'true';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

// Mock next-auth
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(() => ({
    data: null,
    status: 'unauthenticated',
  })),
  signIn: jest.fn(),
  signOut: jest.fn(),
  getSession: jest.fn(),
}));

// Mock environment variables for tests
process.env.NEXTAUTH_URL = 'http://localhost:3000';
process.env.NEXTAUTH_SECRET = 'test-secret-key-for-testing-only';
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';

// Suppress console errors during tests (optional, can be removed if you want to see errors)
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render') ||
        args[0].includes('Warning: An update to') ||
        args[0].includes('act(...)'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

// Global test timeout
jest.setTimeout(30000);
