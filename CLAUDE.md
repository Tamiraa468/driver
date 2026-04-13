# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

React Native (Expo) courier delivery app. Couriers browse available deliveries, claim tasks, track pickups/dropoffs on a map, verify delivery via OTP, and view earnings. Shares a Supabase backend with a separate Merchant Portal (Next.js).

**Language:** Mongolian UI throughout (e.g., "Нүүр", "Хүргэлт", "Орлого").

## Commands

```bash
npm start              # Expo dev server
npm run web            # Web browser (most common for dev)
npm run android        # Android emulator/device
npm run ios            # iOS simulator
npm run lint           # ESLint
```

No test runner is configured. No build step beyond Expo.

## Architecture

### Entry flow

`App.tsx` → `CourierAuthProvider` → `CourierRootNavigator`

The root navigator conditionally renders based on auth state:
- Not authenticated → `CourierAuthStack` (Login / Register)
- Authenticated + KYC needed → `KYCRequiredScreen`
- Authenticated + KYC submitted → `PendingApprovalScreen`
- Authenticated + blocked → `BlockedAccountScreen`
- Authenticated + approved → `CourierTabs` (main app)

### Tab structure (CourierTabs)

| Tab | Screen | Data source |
|-----|--------|-------------|
| Нүүр (Home) | `HomeScreen` | `get_available_tasks` RPC — public task pool |
| Хүргэлт (Deliveries) | `AvailableTasksScreen` | `fetchCourierAssignedTasks` — own tasks only |
| Орлого (Earnings) | `EarningsScreen` | `fetchCourierDashboardTasks` |
| Профайл (Profile) | `ProfileScreen` | Auth context user |

### Modal screens (stack on top of tabs)

- `DeliveryDetailsScreen` — task detail + "Confirm Pickup" button
- `ActiveTrackingScreen` — map + "Mark as Delivered" button → triggers OTP
- `EPODVerificationScreen` — 6-digit OTP entry → completes delivery + records earnings

### Delivery task lifecycle

```
draft → published → assigned → picked_up → delivered → completed
```

- `published → assigned`: courier calls `claim_delivery_task()` RPC (KYC + one-active guard)
- `assigned → picked_up`: courier calls `update_task_status` RPC
- `picked_up → delivered`: `markDeliveredAndRequestOtp()` → `send-otp-email` Edge Function → calls `generate_epod_otp` RPC + sends OTP via Gmail/nodemailer
- `delivered → completed`: `verify_epod_otp()` RPC → bcrypt check → inserts `courier_earnings`

### Key services

| Service | Purpose |
|---------|---------|
| `courierAuthService.ts` | Signup/login/KYC/profile with retry logic |
| `deliveryTaskService.ts` | Task CRUD, claim, status update, OTP, realtime subscriptions |
| `storageService.ts` | KYC document upload to Supabase Storage bucket "KYC" |

All Supabase RPCs use `SECURITY DEFINER` to bypass RLS — the app never does direct `.update()` on `delivery_tasks` (causes RLS recursion).

### State management

- **Auth state**: `CourierAuthContext` — provides `useCourierAuth()` hook
- **Screen state**: local `useState` + service calls
- **Realtime**: Supabase channel subscriptions (`subscribeToCourierTasks`, `subscribeToAvailableTasks`)
- **Cart**: `CartContext` (legacy, for customer flow)

### Design system

All visual constants live in `src/constants/design.ts`:
- `Colors` — primary (#28A86B green), dark (#0E0E0E), background (#F6F4EE cream)
- `Spacing` — xxs(2) through xxl(40)
- `Radius` — card(24), button(18), input(18)
- `FontSize`, `FontWeight`, `Typography`, `Shadow`, `Layout`

All UI components in `src/components/ui/` consume these constants. No raw hex/px values in screens.

### Supabase config

Environment variables: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`

Client configured in `src/config/supabaseClient.ts` with AsyncStorage persistence.

### Edge Functions

| Function | Purpose | Email transport |
|----------|---------|----------------|
| `send-otp-email` | OTP generation + email delivery | nodemailer + Gmail SMTP |

Edge Function secrets (set via `supabase secrets set`):
- `GMAIL_USER` — Gmail address for sending OTP
- `GMAIL_APP_PASSWORD` — Gmail App Password

Deploy: `supabase functions deploy send-otp-email`

The app calls Edge Functions via `supabase.functions.invoke()`, not RPCs directly, for flows that require email (mark delivered, resend OTP).

## Conventions

- Screens import from barrel files: `../../components/ui`, `../../services/deliveryTaskService`
- Types are in `src/types/` with barrel re-export from `index.ts`
- Navigation types are co-located: `CourierRootStackParamList` in `CourierRootNavigator.tsx`
- Status update uses `update_task_status` RPC (not direct table update) to avoid RLS recursion
- `order_id` can be null on some tasks — always use `item.order_id ?? item.id` before `.slice()`
- Mongolian text for all user-facing strings (no i18n library, inline strings)

## Supabase migrations

Migrations are in `supabase/migrations/`. Push with `supabase db push`. Key RPCs:

| RPC | Purpose |
|-----|---------|
| `get_available_tasks(p_limit, p_offset)` | Published tasks for courier pool |
| `claim_delivery_task(p_task_id)` | Atomic claim with KYC + one-active guards |
| `update_task_status(p_task_id, p_new_status)` | Status progression (bypasses RLS) |
| `generate_epod_otp(p_task_id)` | OTP generation + hash storage |
| `verify_epod_otp(p_task_id, p_otp)` | Bcrypt verify → completed + earnings |
| `resend_epod_otp(p_task_id)` | Regenerate + re-send OTP |

Remote DB uses `pickup_note`/`dropoff_note` for addresses (not `pickup_address`/`dropoff_address`).
Remote DB uses `customer_email` for receiver email (not `receiver_email`).

## Known gotchas

- The `locations` table exists but its column names are unknown — avoid joining it. Use `pickup_note`/`dropoff_note` from `delivery_tasks` directly.
- `delivery_tasks` on remote does NOT have `merchant_id` — it may use `org_id` instead. Check before referencing.
- RLS policies on `delivery_tasks` cause infinite recursion if you do `.update()` directly — always use RPCs.
- React 19 with compiler experiments enabled (`reactCompiler: true` in app.json).
- NativeWind (Tailwind for RN) is configured but most styling uses `StyleSheet.create` with design constants.
- pgcrypto extension lives in `extensions` schema on Supabase — RPC functions with `SET search_path = public` must use `extensions.crypt()` / `extensions.gen_salt()`, not unqualified calls.
- `supabase db push` may fail if remote has migrations not in local — use `supabase migration repair` or run SQL directly via Dashboard SQL Editor.
