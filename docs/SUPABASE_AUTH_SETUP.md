# Supabase Auth Setup (Frovo Manager)

The app uses Supabase Auth for email/password, Google OAuth, Apple OAuth, and password recovery.
Configure the **Supabase Dashboard** for your project (not only `.env`).

## 1. Environment variables

Copy `.env.example` → `.env` and set:

- `VITE_SUPABASE_URL` — project URL
- `VITE_SUPABASE_ANON_KEY` — anon (public) key

In **dev**, missing env vars fall back to a bundled test project. **Production builds require real env vars.**

## 2. Site URL & redirect URLs

**Authentication → URL Configuration**

| Setting | Example (local web) | Example (production web) | Native iOS (Capacitor) |
|--------|---------------------|--------------------------|-------------------------|
| Site URL | `http://localhost:5173` | `https://your-domain.com` | (keep your web Site URL) |
| Redirect URLs | `http://localhost:5173/login` | `https://your-domain.com/login` | `frovo://login` |
| | `http://localhost:5173/reset-password` | `https://your-domain.com/reset-password` | `frovo://reset-password` |

The app uses these redirect targets:

- **Google / Apple OAuth** → `/login` on web, `frovo://login` on native iOS
- **Sign-up email confirm** → `/login` or `frovo://login`
- **Password reset email** → `/reset-password` or `frovo://reset-password`

Add every origin you use (localhost ports, staging, production, and both native deep-link URLs).

### Native iOS deep links

The Capacitor app registers the custom URL scheme `frovo` (`capacitor.config.ts` → `ios.scheme`).
After OAuth or email links, Supabase redirects to:

- `frovo://login#access_token=…&refresh_token=…` — sign-in / sign-up confirm
- `frovo://reset-password#access_token=…&type=recovery&…` — password reset

The app listens via `@capacitor/app` `appUrlOpen`, applies tokens with Supabase `setSession` / `exchangeCodeForSession`, then routes in-app.

## 3. Email provider

**Authentication → Providers → Email**

- Enable Email provider
- **Confirm email**: if enabled, users must click the confirmation link before `signInWithPassword` works (the app shows `login.emailNotConfirmed`)
- Customize templates under **Authentication → Email Templates** (confirm signup, reset password)

## 4. Google OAuth

**Authentication → Providers → Google**

1. Enable Google
2. Create OAuth credentials in [Google Cloud Console](https://console.cloud.google.com/) (Web application)
3. Authorized redirect URI (from Supabase Google provider page):

   `https://<project-ref>.supabase.co/auth/v1/callback`

4. Paste Client ID and Client Secret into Supabase

Without this, the Google button redirects to Supabase but sign-in fails.

## 5. Apple OAuth (Sign in with Apple)

**Authentication → Providers → Apple**

1. Enable Apple provider in Supabase
2. In [Apple Developer](https://developer.apple.com/account/):
   - Create an **App ID** with Sign in with Apple enabled (`com.frovo.manager`)
   - Create a **Services ID** (e.g. `com.frovo.manager.auth`) for web/OAuth
   - Configure the Services ID **Return URL**:

     `https://<project-ref>.supabase.co/auth/v1/callback`

   - Create a **Sign in with Apple key**, download `.p8`, note Key ID and Team ID
3. In Supabase Apple provider settings, paste:
   - Services ID (Client ID)
   - Secret Key (`.p8` contents)
   - Key ID
   - Team ID
4. Add `frovo://login` to Supabase **Redirect URLs** (see section 2)

The iOS app uses Supabase `signInWithOAuth({ provider: 'apple', redirectTo: 'frovo://login' })` — no separate native Apple plugin is required for the initial flow.

## 6. What works locally vs production

| Feature | Dev (with `.env` or fallback) | Needs dashboard config |
|--------|-------------------------------|-------------------------|
| Email sign-in / sign-up | Yes, if Email provider on | Confirm-email setting affects flow |
| Google sign-in | Only if Google provider + redirect URLs | Yes |
| Apple sign-in | Only if Apple provider + redirect URLs | Yes |
| Forgot password email | Only if SMTP/templates configured | Yes |
| Reset password page | Yes when link hits `/reset-password` or `frovo://reset-password` | Redirect URL must be allowlisted |
| Native iOS OAuth callback | Yes when `frovo://` URLs allowlisted + Info.plist scheme | Yes |

## 7. App routes

| Route | Purpose |
|-------|---------|
| `/login` | Sign in |
| `/signup` | Register |
| `/forgot-password` | Request reset email |
| `/reset-password` | Set new password from email link |

Protected app routes redirect unauthenticated users to `/login`.
