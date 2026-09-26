"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signUp({ email, password });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setSuccess(true);
    setTimeout(() => router.push("/login"), 2000);
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm bg-surface rounded-2xl p-8">
        <h1 className="text-xl font-semibold mb-1">Create your account</h1>
        <p className="text-on-surface-variant text-sm mb-6">
          Start monitoring your sites, free.
        </p>

        {success ? (
          <p className="text-secondary text-sm">
            Account created — check your email to confirm, then log in.
          </p>
        ) : (
          <form onSubmit={handleSignup} className="flex flex-col gap-4">
            <div>
              <label className="text-sm text-on-surface-variant mb-1 block">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-surface-raised border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary transition-colors"
              />
            </div>

            <div>
              <label className="text-sm text-on-surface-variant mb-1 block">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full bg-surface-raised border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary transition-colors"
              />
            </div>

            {error && <p className="text-danger text-sm">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 bg-primary text-on-primary font-medium rounded-lg py-2 text-sm hover:brightness-110 transition-all disabled:opacity-50"
            >
              {loading ? "Creating account..." : "Sign up"}
            </button>
          </form>
        )}

        <p className="text-xs text-on-surface-variant mt-6 text-center">
          Already have an account?{" "}
          <Link href="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}