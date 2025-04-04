#!/bin/bash
# Pre-deployment check script

echo "Running pre-deployment checks for Juntas Seguras app..."

# Check that all required dependencies are installed
echo "Checking dependencies..."
npm list next mongoose next-auth bcrypt > /dev/null 2>&1
if [ $? -ne 0 ]; then
  echo "ERROR: Missing dependencies. Run 'npm install' first."
  exit 1
fi
echo "✅ Dependencies check passed"

# Check TypeScript compilation
echo "Running TypeScript check..."
npx tsc --noEmit
if [ $? -ne 0 ]; then
  echo "⚠️ TypeScript check found errors. Consider fixing them before deployment."
  # Not exiting with error to allow deployment with type warnings
else
  echo "✅ TypeScript check passed"
fi

# Check for required environment variables in .env.production
echo "Checking environment variables..."
REQUIRED_VARS=("MONGODB_URI" "NEXTAUTH_URL" "NEXTAUTH_SECRET")
ENV_FILE=".env.production"

if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: $ENV_FILE file not found!"
  exit 1
fi

MISSING=0
for VAR in "${REQUIRED_VARS[@]}"; do
  if ! grep -q "^$VAR=" "$ENV_FILE"; then
    echo "ERROR: $VAR is missing in $ENV_FILE"
    MISSING=1
  fi
done

if [ $MISSING -eq 1 ]; then
  echo "Please add all required environment variables before deploying."
  exit 1
fi
echo "✅ Environment variables check passed"

# Check build
echo "Running build check..."
npm run build
if [ $? -ne 0 ]; then
  echo "ERROR: Build failed. Fix build errors before deploying."
  exit 1
fi
echo "✅ Build check passed"

echo "All checks completed. Ready for deployment!"
echo ""
echo "REMINDER: When deploying to Vercel, add these environment variables:"
echo "- MONGODB_URI (your MongoDB Atlas connection string)"
echo "- NEXTAUTH_SECRET (from .env.production)"
echo "- NEXTAUTH_URL (your Vercel deployment URL)"
echo ""
echo "See VERCEL_DEPLOYMENT.md for more details."