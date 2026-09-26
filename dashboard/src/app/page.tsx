import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pulsewatch — Live uptime, SSL & domain monitoring for agencies",
  description:
    "Monitor your clients' websites, SSL certificates, and domains in real time. Reliable alerts, white-labeled status pages, built for freelancers and dev agencies.",
};

const features = [
  {
    title: "Live uptime monitoring",
    desc: "Real HTTP checks on your schedule, with multi-check confirmation before alerting — no false-positive spam.",
  },
  {
    title: "SSL & domain expiry tracking",
    desc: "Never get caught by an expired certificate or forgotten domain renewal again.",
  },
  {
    title: "Live dashboard",
    desc: "Real-time status updates pushed to your dashboard the instant something changes.",
  },
  {
    title: "White-labeled status pages",
    desc: "Shareable, professional status pages you can send straight to your clients.",
  },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      <nav className="flex items-center justify-between px-8 py-6 max-w-6xl mx-auto">
        <span className="text-lg font-semibold">Pulsewatch</span>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/login" className="text-on-surface-variant hover:text-on-surface">
            Log in
          </Link>
          <Link
            href="/signup"
            className="bg-primary text-on-primary px-4 py-2 rounded-lg font-medium hover:brightness-110"
          >
            Get started
          </Link>
        </div>
      </nav>

      <section className="max-w-3xl mx-auto text-center px-4 py-20">
        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight mb-5">
          Know before your client does.
        </h1>
        <p className="text-on-surface-variant text-lg mb-8">
          Live uptime, SSL, and domain monitoring built for freelancers and dev
          agencies managing multiple client websites.
        </p>
        <Link
          href="/signup"
          className="inline-block bg-primary text-on-primary px-6 py-3 rounded-lg font-medium hover:brightness-110"
        >
          Start monitoring, free
        </Link>
      </section>

      <section className="max-w-5xl mx-auto px-4 py-16 grid grid-cols-1 md:grid-cols-2 gap-6">
        {features.map((f) => (
          <div key={f.title} className="bg-surface rounded-2xl p-6">
            <h3 className="font-medium mb-2">{f.title}</h3>
            <p className="text-on-surface-variant text-sm">{f.desc}</p>
          </div>
        ))}
      </section>

      <footer className="text-center text-xs text-on-surface-variant py-10">
        © {new Date().getFullYear()} Pulsewatch
      </footer>
    </main>
  );
}