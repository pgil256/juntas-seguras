Demo Application Plan - Juntas Seguras
Based on the codebase analysis and SETUP_GUIDE.md, here's a comprehensive plan to get the app demo-ready for a focus group (2-3 pools, 8-12 users) in 8-12 hours.

Current State Summary
Component	Status	Notes
Google/Microsoft OAuth	⚠️ Configured but broken	Session ID mismatch issue
MongoDB	✅ Working	Atlas connection works
Email (Gmail)	⚠️ Configured, untested	Credentials in .env
Twilio SMS	❌ Not configured	Missing env vars
Stripe Payments	❌ Mocked only	In-memory storage, not real
Pool Creation	⚠️ Partially working	User lookup bug
Invitations	⚠️ DB works, email broken	No actual emails sent
Contributions	❌ Not implemented	Mock storage only
Payouts	❌ Not implemented	Requires Stripe Connect
Messaging	⚠️ In-memory only	Lost on restart
Priority Tasks (8-12 hours)
Phase 1: Fix Critical Auth/User Bugs (2-3 hours)
Fix OAuth user ID mismatch - The session stores NextAuth sub instead of MongoDB _id

Fix JWT callback to always set token.id = dbUser._id.toString()
Ensure user is created on first OAuth login
Test with fresh session (clear cookies)
Fix user lookup in API routes - Currently failing with invalid ObjectId

Already partially fixed, needs server restart/cache clear
Verify email fallback lookup works
Test end-to-end login flow

Microsoft OAuth → Dashboard → Create Pool
Google OAuth → Dashboard → Join Pool

Phase 2: Core ROSCA Functionality (3-4 hours)
Fix pool creation flow

Ensure pools are created and stored in MongoDB
Verify creator is added as admin member
Test pool appears on dashboard
Fix invitation system

Verify invitation emails actually send (check terminal logs)
Test invitation acceptance flow
Ensure invited user is added to pool
Implement basic contribution tracking

Store contributions in MongoDB (not in-memory Map)
Add contribution status per member per round
Show contribution status in UI
Implement basic payout flow (simplified)

Manual payout trigger for admin
Record payout in transactions
Advance to next round
Skip Stripe Connect for demo (manual/mock payouts)

Phase 3: Twilio SMS Setup (1 hour)
Configure Twilio
Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER to .env
Test SMS MFA code sending
Verify code validation works

Phase 4: UI Polish & Bug Fixes (2-3 hours)
Fix obvious UI bugs

Error messages displaying properly
Loading states working
Mobile responsiveness issues
Persist messages to MongoDB

Move from in-memory Map to pool.messages array
Messages survive restart
Dashboard improvements

Show user's pools correctly
Show next payout date
Show contribution status

Phase 5: Testing & Demo Prep (1 hour)
Create test accounts

8-12 users with verified emails
Mix of Google and Microsoft logins
Create test pools

2-3 pools with different configurations
Weekly, biweekly frequencies
Document demo flow

Step-by-step script for demo
Known limitations to avoid
Code to Simplify/Remove
File/Feature	Issue	Recommendation
lib/services/mfa.ts TOTP	Unused, adds complexity	Remove TOTP setup, keep email only
app/api/payments/ mock Maps	Data lost on restart	Replace with MongoDB or remove
Identity verification flow	Incomplete, requires Stripe Identity	Skip for demo, mark as "coming soon"
app/api/security/activity-log	May not exist, causes errors	Remove activity logging calls
Escrow payment scheduling	Overcomplicated, not working	Simplify to direct contributions
Member position drag-drop	Partially implemented	Keep simple list ordering
Environment Variables Needed

# Already configured
MONGODB_URI=✅
NEXTAUTH_URL=✅
NEXTAUTH_SECRET=✅
GOOGLE_CLIENT_ID=✅
GOOGLE_CLIENT_SECRET=✅
AZURE_AD_CLIENT_ID=✅
AZURE_AD_CLIENT_SECRET=✅
AZURE_AD_TENANT_ID=✅
EMAIL_USER=✅
EMAIL_PASSWORD=✅
EMAIL_FROM=✅

# Need to add
TWILIO_ACCOUNT_SID=<get from twilio.com>
TWILIO_AUTH_TOKEN=<get from twilio.com>
TWILIO_PHONE_NUMBER=<purchase from twilio>

# Optional for demo (can skip real payments)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

Recommended Demo Scope
Include in Demo:

Sign up/login with Google or Microsoft
Email-based MFA verification
Create a savings pool
Invite members via email
Accept invitation and join pool
View pool dashboard with members
Basic messaging within pool
View payout schedule
Exclude from Demo (mark as "Phase 2"):

Actual payment collection via Stripe
Automated payout processing
SMS-based MFA (unless Twilio configured)
Identity verification
Escrow payments
Time Estimate Breakdown
Phase	Tasks	Hours
1. Auth fixes	OAuth, user lookup, session	2-3
2. Core ROSCA	Pools, invitations, contributions	3-4
3. Twilio	SMS MFA setup	1
4. UI Polish	Bug fixes, persistence	2-3
5. Testing	Test accounts, demo prep	1
Total		9-12 hours
