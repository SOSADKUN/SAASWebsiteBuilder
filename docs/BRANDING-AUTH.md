# SERVQO branding and authentication UI

Main changed/new files:

- Shared branding/loading: `src/components/brand.tsx`,
  `src/components/servqo-loading.tsx`, `src/app/loading.tsx`,
  `src/app/dashboard/loading.tsx`, `src/app/layout.tsx`, `src/app/manifest.ts`,
  `src/app/admin/page.tsx` and `public/brand/*`.
- Forms and visuals: `src/components/auth/auth-page.tsx`, `auth-submit.tsx`,
  `password-field.tsx`, `platform-illustration.tsx`, `src/app/servqo-login.css`,
  `src/app/servqo-auth.css` and the stylesheet import in `globals.css`.
  The obsolete rotating `login-showcase.tsx` was removed.
- Authentication/recovery: safe sign-in failures in `src/server/actions.ts`,
  `src/server/password-actions.ts`, `src/app/auth/recovery/route.ts`,
  `src/app/forgot-password/page.tsx` and `src/app/reset-password/page.tsx`.
- Regression tests: `tests/brand-auth.test.tsx` and
  `tests/password-recovery.test.ts`.

The supplied logo image is retained unchanged at
`public/brand/servqo-logo-source.png`. Optimized WebP/PNG derivatives in the same
folder supply the shared `Brand` component, loading component, browser icon,
Apple touch icon and web manifest. Resizing preserves the entire artwork,
proportions, original colors and surrounding whitespace. No replacement glyph or
redrawn logo is used. Functional business/navigation icons remain unchanged.

`AuthPage` renders login, registration and recovery forms inside a responsive
45/55 split card. `PlatformIllustration` uses SVG gradients and soft shadows for
the winding path, with ordinary business feature icons. The layout is real HTML,
not the reference screenshot. The illustration is hidden on phones; forms retain
natural scrolling for small screens, zoom and the keyboard.

`PasswordField` provides an accessible visibility toggle. `AuthSubmit` combines
React form pending state with a synchronous click guard and native validity
checking, so duplicate clicks cannot start another submission. Invalid login and
provider/network errors return to login with safe messages. Existing Supabase SSR
cookies, successful `/dashboard` redirect, onboarding and authorization checks are
retained. No persistence checkbox is shown: the existing session behavior is
unchanged, and a precise 30-day lifetime is not promised.

## Loading

`ServqoLoading` is used by the initial app and dashboard route loading boundaries.
It animates the original raster logo with a 2.2-second opacity/transform reveal
and a subtle highlight, followed by a hold. It deliberately does not invent or
reconstruct individual logo segments. All motion stops under
`prefers-reduced-motion`; fixed asset dimensions avoid layout shifts.

Sign-in shows a small button indicator during authentication. The route boundary
shows workspace loading when dashboard rendering is pending after redirect.
There is no artificial minimum display time, success interstitial, refresh timer
or new authentication effect. Workspace errors and missing-merchant onboarding
still resolve through the existing server loader. Small background actions retain
their existing non-blocking feedback.

## Password recovery setup

The previously absent Forgot password flow now uses Supabase SSR PKCE:
`resetPasswordForEmail` → `/auth/recovery` code exchange → authenticated
`/reset-password` → `updateUser`. It uses the existing public application origin;
no admin key or new database tables are needed. Passwords/codes are not logged.
The recovery callback sends private/no-store and no-referrer headers, and invalid
codes fail closed. Password updates require a fresh server-verified user and
matching passwords of at least eight characters.

In Supabase Auth URL Configuration, allow
`https://servqo.vercel.app/auth/recovery`, along with the existing confirmation
callback. Add the corresponding localhost callback only for development. Keep
`NEXT_PUBLIC_APP_URL` set to the intended canonical origin, and retain the standard
Supabase recovery email link. Open a PKCE reset link in the browser where the
request began. Custom recovery email templates that bypass the PKCE callback need
separate configuration; this change does not modify hosted templates or SMTP.
See [Supabase password authentication](https://supabase.com/docs/guides/auth/passwords).

## Verification and limits

Unit tests verify logo usage, accessible loading, login controls and recovery
validation/session/callback behavior. Browser QA uses actual components with
simulated form actions, testing desktop viewport fit, mobile layout, password
visibility, duplicate submission, failed-login behavior and reduced motion.
Production TypeScript, ESLint, test and build commands are run separately.
No production account was signed in and no recovery email was sent during QA.
Hosted email delivery and a real authenticated redirect still require a live
account check. This branding/auth update requires no new database migration.
