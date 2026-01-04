/**
 * Next.js Instrumentation
 * This file runs once when the server starts.
 * Used to validate environment variables before the application accepts requests.
 */

export async function register() {
  // Only run validation on the server (Node.js runtime)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { validateEnvVarsOrThrow } = await import('./lib/validation');

    console.log('\n🔍 Validating environment variables...');
    validateEnvVarsOrThrow();
  }
}
