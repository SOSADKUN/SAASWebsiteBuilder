# Contact SERVQOO configuration

Dashboard location: **Settings → Contact SERVQOO**, `/dashboard/settings/contact`.

Set the existing shared contact variables in `.env.local` for local development, and in **Vercel → Project → Settings → Environment Variables → Production** for the deployed application:

```dotenv
SERVQOO_CONTACT_EMAIL=
SERVQOO_WHATSAPP_NUMBER=
```

Use your actual support email. For WhatsApp, use the international country code and number as digits only: no `+`, spaces, punctuation, or local leading zero. For a Malaysian number, replace the initial `0` with `60`.

Restart the local server after changing `.env.local`. Redeploy through your normal reviewed workflow after updating Vercel variables. Do not put real contact details in `.env.example`; its blank entries document the settings.

Email uses `mailto:` to open the visitor's configured email application addressed to SERVQOO. WhatsApp opens `https://wa.me/<number>?text=<encoded-message>` in a new tab with “Hi SERVQOO, I would like to know more about your services.” pre-filled. These same variables also configure the public Contact page. Missing or invalid WhatsApp numbers hide the WhatsApp option on both pages. The dashboard email button stays disabled until a valid email is configured.

No database migration, email delivery provider, WhatsApp API integration, or contact form is needed. Existing Settings permissions and authentication apply.
