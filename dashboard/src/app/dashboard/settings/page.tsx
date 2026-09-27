"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function SettingsPage() {
  const [email, setEmail] = useState("");
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [loading, setLoading] = useState(true);

  const [newPassword, setNewPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);

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
      setPasswordMessage(error.message);
    } else {
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

  if (loading) return <main className="p-10 text-on-surface-variant">Loading...</main>;

  return (
    <main className="min-h-screen px-8 py-10 max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold mb-1">Settings</h1>
      <p className="text-on-surface-variant text-sm mb-8">
        Manage your account and notification preferences
      </p>

      <div className="bg-surface rounded-2xl p-6 mb-6">
        <p className="text-sm font-medium mb-1">Account</p>
        <p className="text-sm text-on-surface-variant">{email}</p>
      </div>

      <div className="bg-surface rounded-2xl p-6 mb-6">
        <p className="text-sm font-medium mb-3">Change password</p>
        <form onSubmit={handlePasswordChange} className="flex gap-2">
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
          <p className="text-xs text-on-surface-variant mt-2">{passwordMessage}</p>
        )}
      </div>

      <div className="bg-surface rounded-2xl p-6 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Email alerts</p>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Get notified when a site goes down or an SSL cert is expiring
          </p>
        </div>
        <button
          onClick={handleToggleAlerts}
          disabled={togglingAlerts}
          className="w-11 h-6 rounded-full relative transition-colors disabled:opacity-50"
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