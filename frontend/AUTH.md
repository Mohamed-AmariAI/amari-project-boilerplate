# Supabase Authentication Setup Plan

## Architecture Overview

Your app will use Supabase Auth with the following flow:
1. **Unauthenticated users** → Automatically redirected to `/sign-in`
2. **Sign in/Sign up** → Email/password authentication via server actions (auto-verified)
3. **Session created** → User immediately authenticated after signup
4. **Authenticated users** → Access main app at `/` with full functionality
5. **Middleware protection** → Enforces auth rules across all routes

---

## Implementation Steps

### 1. Install Dependencies
- `@supabase/supabase-js` - Core Supabase client
- `@supabase/ssr` - Server-side rendering package for Next.js App Router

### 2. Environment Setup
Create `.env.local` with:
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Public anonymous key

### 3. Supabase Client Utilities (3 files in `/lib/supabase/`)
- **`client.ts`** - Browser client for client components
- **`server.ts`** - Server client for server components/actions
- **`middleware.ts`** - Middleware client for route protection

### 4. Auth Server Actions (`/app/(auth)/actions.ts`)
- `signIn(formData)` - Validates and signs in with email/password
- `signUp(formData)` - Creates new user account (auto-verified)
- `signOut()` - Terminates session and redirects

**Why use actions.ts instead of putting functions in page.tsx?**

Server actions in Next.js must be defined with `'use server'` directive and have specific requirements:
- **Separation of concerns**: Keeps UI (page.tsx) separate from business logic (actions.ts)
- **Reusability**: Actions can be imported and used across multiple components
- **Type safety**: Easier to type and test when isolated
- **Next.js best practice**: Server actions should be in dedicated files for better code organization
- **Performance**: Actions can be optimized separately from UI components
- **Security**: Server-only code is clearly separated from client code
- **Maintainability**: Easier to locate and update authentication logic

If we put functions directly in page.tsx, they would need to be mixed with client-side UI code, making the file harder to maintain and violating the single-responsibility principle.

### 5. Auth Pages (`/app/(auth)/`)
Using **shadcn/ui** components you already have:
- **`/sign-in/page.tsx`** - Login form with email/password inputs
- **`/sign-up/page.tsx`** - Registration form with email/password inputs
- Shared form UI using: `Card`, `Button`, `Input`, `Label` components
- Form validation with `react-hook-form` + `zod` (already installed)

### 6. Middleware (`/middleware.ts`)
- Protects root `/` route (requires authentication)
- Redirects unauthenticated → `/sign-in`
- Redirects authenticated users away from auth pages → `/`
- Excludes static assets, API routes

### 7. Main App Updates
- **Root page** (`/app/page.tsx`) - Now protected, only accessible when authenticated
- **Add sign-out button** - User can log out from main interface
- **Optional**: Display user email in header

### 8. Layout Updates
- Update `app/layout.tsx` to support auth flow
- No major changes needed, just ensure proper rendering

---

## Key Technical Decisions

- **Server Actions over API Routes** - Follows Next.js 14+ best practices
- **Cookie-based sessions** - Secure, httpOnly cookies managed by Supabase
- **Middleware for protection** - Centralized auth logic, better performance
- **Auto-verified accounts** - Users can sign in immediately after signup (no email confirmation)
- **Dedicated actions.ts file** - Clean separation of server logic from UI components
- **shadcn/ui consistency** - Matches your existing design system
- **Form validation** - Uses `zod` + `react-hook-form` (already in project)

---

## File Structure After Implementation

```
frontend/
├── .env.local                      # NEW - Supabase credentials
├── middleware.ts                   # NEW - Route protection
├── app/
│   ├── (auth)/                    # NEW - Auth route group
│   │   ├── sign-in/
│   │   │   └── page.tsx          # NEW - Sign in form
│   │   ├── sign-up/
│   │   │   └── page.tsx          # NEW - Sign up form
│   │   ├── actions.ts            # NEW - Auth server actions (separate file for clean architecture)
│   │   └── layout.tsx            # NEW - Auth pages layout (optional)
│   ├── layout.tsx                # UPDATED - Support auth
│   └── page.tsx                  # PROTECTED - Main app (existing)
├── lib/
│   ├── supabase/                 # NEW - Supabase utilities
│   │   ├── client.ts             # Browser client
│   │   ├── server.ts             # Server client
│   │   └── middleware.ts         # Middleware client
│   ├── api.ts                    # EXISTING - Keep for backend
│   └── types.ts                  # OPTIONAL - Add auth types
└── components/
    └── sign-out-button.tsx       # NEW - Sign out component
```

---

## User Experience Flow

1. **First visit** → User opens `http://localhost:3000/`
2. **Middleware checks** → No session found
3. **Redirect** → `http://localhost:3000/sign-in`
4. **User signs up** → Enters email/password
5. **Auto-verification** → Account created and immediately verified
6. **Session created** → User automatically signed in and redirected to `/`
7. **Authenticated** → Full access to main app
8. **Sign out** → Click button, session cleared, redirect to `/sign-in`

**Note**: No email confirmation step required - users can start using the app immediately after signup.

---

## Security Features

- **httpOnly cookies** - Prevents XSS attacks
- **Secure flag** - HTTPS only in production
- **Server-side validation** - All auth logic on server
- **CSRF protection** - Built into Next.js server actions
- **Password requirements** - Enforced by Supabase (minimum length, complexity)

**Note**: Email verification is disabled for faster onboarding. For production apps with spam concerns, consider enabling email verification in Supabase settings.

---

## Supabase Dashboard Setup Required

Before running the code, you'll need to:
1. Enable **Email provider** in Supabase Auth settings
2. **Disable email confirmation**: Go to Authentication → Providers → Email → Disable "Confirm email"
3. Configure **Site URL** to `http://localhost:3000`
4. Copy project URL and anon key to `.env.local`

This setup allows users to sign up and immediately access the app without email verification.

---

## Current Codebase Analysis

### Existing Structure
- **Next.js Version**: 16.0.0
- **React Version**: 19.2.0
- **Styling**: Tailwind CSS 4.1.9 + shadcn/ui (55+ components installed)
- **Form Handling**: react-hook-form + zod (already installed)
- **Current Routing**: Single page application at `/`
- **No Auth**: Currently no authentication system

### Dependencies Already Installed
- All shadcn/ui peer dependencies (@radix-ui/react-*)
- react-hook-form + @hookform/resolvers
- zod for validation
- next-themes for dark mode
- sonner for toast notifications
- lucide-react for icons

### Backend Integration
- Current API: `http://localhost:8000`
- Endpoint: `POST /process-documents`
- No authentication currently required
- API client at `/lib/api.ts` will remain unchanged

---

**Ready to execute?** This plan will give you a production-ready authentication system with minimal complexity. The implementation uses official Supabase patterns for Next.js App Router and leverages your existing shadcn/ui components for consistency.
