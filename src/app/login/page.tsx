import { signIn, signUp } from "@/server/actions";
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;
  return (
    <main className="auth-page">
      <div className="auth-brand">
        <span className="brand-icon">b.</span>
        <span>
          bloom<span className="brand-dot">®</span>
        </span>
        <h1>
          Your next chapter
          <br />
          starts online.
        </h1>
        <p>
          A beautiful home for your business.
          <br />
          Built by you, powered by Bloom.
        </p>
      </div>
      <div className="auth-card">
        <span className="eyebrow">LET’S MAKE SOMETHING GREAT</span>
        <h2>Welcome to Bloom</h2>
        <p>Sign in to build your business’s little corner of the internet.</p>
        {!process.env.NEXT_PUBLIC_SUPABASE_URL && (
          <div className="notice">
            Setup required: configure Supabase and DATABASE_URL in .env.local.
            See README.md for the complete setup.
          </div>
        )}
        {params.error && (
          <p className="notice error" role="alert">
            {params.error}
          </p>
        )}
        {params.message && (
          <p className="notice" role="status">
            {params.message}
          </p>
        )}
        <form action={signIn}>
          <label>
            Email address
            <input
              name="email"
              type="email"
              placeholder="you@yourcafe.com"
              required
            />
          </label>
          <label>
            Password
            <input name="password" type="password" minLength={8} required />
          </label>
          <button
            className="button primary"
            disabled={!process.env.NEXT_PUBLIC_SUPABASE_URL}
          >
            Sign in →
          </button>
          <button
            className="button"
            formAction={signUp}
            disabled={!process.env.NEXT_PUBLIC_SUPABASE_URL}
          >
            Create an account
          </button>
        </form>
        <small>New accounts receive an email confirmation link.</small>
      </div>
    </main>
  );
}
