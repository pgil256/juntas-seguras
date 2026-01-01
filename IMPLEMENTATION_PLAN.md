# Implementation Plan: Complete Missing Features

## Overview

This plan outlines the remaining work to complete the my-juntas-app, focusing on the priority items for demo functionality and additional features.

---

## Priority 1: Contribution UI (Critical for Demo)

### Current State
- API exists at `app/api/pools/[id]/contributions/route.ts` (GET/POST)
- No UI component to make contributions
- "Make Payment" button in pool detail page does nothing

### Implementation Steps

#### Step 1.1: Create `usePoolContributions` Hook
**File:** `lib/hooks/usePoolContributions.ts`

```typescript
// Hook to manage contribution status and making contributions
// - getContributionStatus(): Fetch current round contribution status
// - makeContribution(): POST to contributions API
// - Returns: loading, error, contributionStatus, userHasContributed, isRecipient
```

#### Step 1.2: Create `ContributionModal` Component
**File:** `components/pools/ContributionModal.tsx`

Features:
- Shows contribution amount and current round
- Displays who the recipient is for this round
- Shows if user is the recipient (no contribution needed)
- Shows if user already contributed this round
- "Confirm Contribution" button (demo mode - no real payment)
- Success/error states
- Option to add real Stripe integration later

#### Step 1.3: Create `ContributionStatusCard` Component
**File:** `components/pools/ContributionStatusCard.tsx`

Features:
- Shows contribution status for all members this round
- Progress bar showing X/Y contributions received
- Checkmarks for who has contributed
- "Make Contribution" button for current user if not yet contributed
- Recipient badge for the member receiving payout

#### Step 1.4: Integrate into Pool Detail Page
**File:** `app/pools/[id]/page.tsx`

Changes:
- Add "Contributions" tab to the tabbed interface
- Replace placeholder "Make Payment" button with working contribution flow
- Wire up ContributionModal to the "Make Payment" button
- Show ContributionStatusCard in the new Contributions tab

---

## Priority 2: Payout UI for Admins (Critical for Demo)

### Current State
- API exists at `app/api/pools/[id]/payouts/route.ts` (GET/POST)
- `PoolPayoutsManager` component exists but is NOT integrated into any page
- `usePoolPayouts` hook exists and works

### Implementation Steps

#### Step 2.1: Add Payouts Tab to Pool Detail Page
**File:** `app/pools/[id]/page.tsx`

Changes:
- Add a "Payouts" tab to the existing tabs
- Import and render `PoolPayoutsManager` in the Payouts tab
- Pass required props: poolId, userId, isAdmin, poolName
- Determine isAdmin from the user's role in the pool members list

#### Step 2.2: Show Payout Ready Alert (Optional Enhancement)
When all contributions are received, show a prominent alert on the pool detail page for admins indicating they can process the payout.

---

## Priority 3: Dashboard Contribution Status (Critical for Demo)

### Current State
- `app/my-pool/page.tsx` shows pool info and members table
- "Paid This Round" column exists but shows incorrect logic (based on paymentsOnTime vs paymentsMissed)
- No actual fetch of contribution status for current round

### Implementation Steps

#### Step 3.1: Create `usePoolDashboardStatus` Hook
**File:** `lib/hooks/usePoolDashboardStatus.ts`

Features:
- Fetches contribution status for the selected pool's current round
- Returns per-member contribution status
- Caches/updates when pool selection changes

#### Step 3.2: Update My Pool Page
**File:** `app/my-pool/page.tsx`

Changes:
- Fetch contribution status when pool is selected
- Fix "Paid This Round" column to show actual contribution status
- Add visual indicator for current round recipient
- Add a "Current Round Status" summary card showing:
  - Who the recipient is
  - How many members have contributed
  - Your contribution status
  - "Make Contribution" quick action button

#### Step 3.3: Add Quick Contribution Button to Dashboard
Allow users to make contributions directly from the dashboard without navigating to pool detail page.

---

## Priority 4: Mobile Responsiveness (Important)

### Current State
- Some responsive improvements done
- Tables not fully mobile-friendly
- Member list on mobile needs work

### Implementation Steps

#### Step 4.1: Audit All Pages on Mobile
Test the following pages at 375px width:
- `/my-pool` (dashboard)
- `/pools/[id]` (pool detail)
- `/member-management/[id]`
- `/settings`
- `/create-pool`

#### Step 4.2: Fix Identified Issues
Common patterns to apply:
- Use responsive table with horizontal scroll
- Stack cards vertically on mobile
- Hide less important columns on mobile
- Use collapsible sections for dense content
- Ensure touch targets are 44x44px minimum

---

## Secondary Features (Post-Demo)

### 5. Stripe Integration (Future)

#### Step 5.1: Payment Collection
- Create Stripe PaymentIntent when user clicks "Make Contribution"
- Use Stripe Elements for card input
- Handle payment confirmation
- Update contribution status on success

#### Step 5.2: Stripe Connect for Payouts
- Set up Stripe Connect accounts for pool members
- When admin processes payout, create Stripe Transfer
- Handle payout confirmation and errors

#### Step 5.3: Webhooks
- Set up `/api/webhooks/stripe` endpoint
- Handle payment_intent.succeeded
- Handle transfer.created, transfer.paid
- Update pool/member status accordingly

### 6. Identity Verification (Future)

#### Step 6.1: Stripe Identity Setup
- Integrate Stripe Identity for member verification
- Create verification session when member joins

#### Step 6.2: Verification UI
- Verification status badge on member profiles
- "Verify Identity" button for unverified members
- Admin view of verification status

### 7. Member Position Drag-Drop (Enhancement)

#### Step 7.1: Add Drag-Drop Library
- Install `@dnd-kit/core` and `@dnd-kit/sortable`

#### Step 7.2: Create Sortable Member List
- Allow admins to reorder member positions
- Save new positions via API call
- Only allow before pool starts

### 8. Activity Logging (Fix)

#### Step 8.1: Audit Current Logging
- Find all places that log activity
- Identify non-existent endpoints being called

#### Step 8.2: Fix or Remove Broken Logging
- Either implement missing endpoints
- Or remove calls to non-existent endpoints

### 9. Email Notifications (Enhancement)

#### Step 9.1: Contribution Reminder
- Send email when round starts
- Remind members to contribute

#### Step 9.2: Payout Notification
- Notify recipient when payout is ready
- Notify all members when payout is processed

---

## File Summary

### New Files to Create
1. `lib/hooks/usePoolContributions.ts`
2. `components/pools/ContributionModal.tsx`
3. `components/pools/ContributionStatusCard.tsx`
4. `lib/hooks/usePoolDashboardStatus.ts`

### Existing Files to Modify
1. `app/pools/[id]/page.tsx` - Add Contributions tab, Payouts tab, wire up buttons
2. `app/my-pool/page.tsx` - Add contribution status fetching, fix "Paid This Round" column

### Components Already Built (Just Need Integration)
1. `components/pools/PoolPayoutsManager.tsx` - Ready to use, just needs to be added to pool detail page

---

## Estimated Implementation Order

1. **Contribution UI** (~2-3 hours)
   - Create usePoolContributions hook
   - Create ContributionModal component
   - Wire up "Make Payment" button in pool detail page
   - Add Contributions tab with ContributionStatusCard

2. **Payout UI Integration** (~30 minutes)
   - Add Payouts tab to pool detail page
   - Import and configure PoolPayoutsManager

3. **Dashboard Status** (~1-2 hours)
   - Create usePoolDashboardStatus hook
   - Fix "Paid This Round" column
   - Add current round status summary

4. **Mobile Responsiveness** (~1-2 hours)
   - Audit and fix each page

---

## Testing Checklist

After implementation, verify:

- [ ] User can see contribution status for current round
- [ ] User can make a contribution (demo mode)
- [ ] User who is recipient sees "No contribution needed" message
- [ ] User who already contributed sees "Already contributed" message
- [ ] Contribution updates are reflected immediately in UI
- [ ] Admin can see "Process Payout" button when all contributions received
- [ ] Admin can process payout successfully
- [ ] Dashboard shows accurate "Paid This Round" status
- [ ] All pages work on mobile (375px width)
- [ ] System messages are added when contributions/payouts occur
