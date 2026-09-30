"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { PageHeader } from "@/components/PageHeader";

export default function SettingsPage() {
  const [email, setEmail] = useState("");
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [loading, setLoading] = useState(true);

  const [newPassword, setNewPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState(false);

  const [togglingAlerts, setTogglingAlerts] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setEmail(data.user.email ?? "");
        const metadata = data.user.user_metadata ?? {};
        setAlertsEnabled(metadata.email_alerts_enabled ?? true);
      }
      setLoading(false);
    });
  }, []);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSaving(true);
    setPasswordMessage(null);

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    setPasswordSaving(false);

    if (error) {
      setPasswordError(true);
      setPasswordMessage(error.message);
    } else {
      setPasswordError(false);
      setPasswordMessage("Password updated.");
      setNewPassword("");
    }
  };

  const handleToggleAlerts = async () => {
    setTogglingAlerts(true);
    const newValue = !alertsEnabled;

    const { error } = await supabase.auth.updateUser({
      data: { email_alerts_enabled: newValue },
    });

    if (!error) {
      setAlertsEnabled(newValue);
    }
    setTogglingAlerts(false);
  };

  if (loading) {
    return (
      <main className="px-4 md:px-10 py-10 text-on-surface-variant text-sm">
        Loading...
      </main>
    );
  }

  return (
    <main className="px-4 md:px-10 py-8 md:py-10 max-w-2xl mx-auto">
      <PageHeader
        title="Settings"
        description="Account access and email notifications for incidents and SSL warnings."
      />

      <div className="bg-surface rounded-2xl p-6 mb-6">
        <p className="text-xs uppercase tracking-wider text-on-surface-variant font-mono mb-2">
          Account
        </p>
        <p className="text-sm font-medium">{email || "Unknown user"}</p>
      </div>

      <div className="bg-surface rounded-2xl p-6 mb-6">
        <p className="text-sm font-medium mb-3">Change password</p>
        <form onSubmit={handlePasswordChange} className="flex flex-col sm:flex-row gap-2">
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="New password"
            minLength={6}
            required
            className="flex-1 bg-surface-raised border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <button
            type="submit"
            disabled={passwordSaving}
            className="bg-primary text-on-primary text-sm font-medium px-4 py-2 rounded-lg hover:brightness-110 disabled:opacity-50"
          >
            {passwordSaving ? "Saving..." : "Update"}
          </button>
        </form>
        {passwordMessage && (
          <p
            className={`text-xs mt-2 ${passwordError ? "text-danger" : "text-success"}`}
          >
            {passwordMessage}
          </p>
        )}
      </div>

      <div className="bg-surface rounded-2xl p-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium">Email alerts</p>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Notify you when a site goes down or an SSL certificate is expiring.
          </p>
        </div>
        <button
          type="button"
          onClick={handleToggleAlerts}
          disabled={togglingAlerts}
          aria-pressed={alertsEnabled}
          className="w-11 h-6 rounded-full relative transition-colors disabled:opacity-50 shrink-0"
          style={{ backgroundColor: alertsEnabled ? "#8B7CFF" : "#5A6072" }}
        >
          <span
            className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all"
            style={{ left: alertsEnabled ? "22px" : "2px" }}
          />
        </button>
      </div>
    </main>
  );
}
