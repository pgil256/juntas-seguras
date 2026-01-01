# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run test-db` - Test database connection
- `npm run clean` - Clean .next directory
- `npm run pre-deploy-check` - Run pre-deployment validation

## Code Style
- **Imports**: Group imports - React, Next.js, external libraries, internal components/utils
- **Component Structure**: Use named exports for UI components, React.forwardRef for interactive elements
- **Naming**: PascalCase for components, camelCase for variables/functions, types end with 'Type'
- **Types**: Use TypeScript types/interfaces, prefer explicit types over 'any'
- **CSS**: Use Tailwind with compositional utilities via cn() helper from lib/utils
- **Styling**: Use class-variance-authority (cva) for component variants
- **Error Handling**: Use try/catch for async operations, provide meaningful error messages
- **File Structure**: Group related components in subdirectories, follow Next.js app router conventions
- **Comments**: Add component comments at top of file, document complex logic

## UI Components
- Use shadcn/ui pattern with Radix UI primitives as the base
- Utilize the component composition pattern for reusable UI elements

## Architecture Overview
- **Next.js App Router**: Project uses Next.js 15 with App Router structure
- **Authentication**: NextAuth with JWT strategy and custom MFA implementation
- **Database**: MongoDB with Mongoose for data modeling
- **API Routes**: Located in app/api directory following Next.js convention
- **Payment Processing**: PayPal integration for escrow payments and payouts (see PAYPAL_SETUP.md)
- **Security**: Multi-factor authentication, audit logging, and identity verification