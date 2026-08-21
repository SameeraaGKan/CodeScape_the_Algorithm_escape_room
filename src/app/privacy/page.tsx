import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { ShieldCheck } from "lucide-react";

const EFFECTIVE_DATE = "6 July 2026";
const CONTACT_EMAIL = "sameeraagk883@gmail.com";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="font-(family-name:--font-orbitron) text-lg sm:text-xl font-bold text-neon-cyan mb-4">
        {title}
      </h2>
      <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">{children}</div>
    </section>
  );
}

export default function PrivacyPolicyPage() {
  return (
    <>
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 pt-28 pb-20">
        <div className="flex items-center gap-3 mb-3">
          <ShieldCheck className="w-6 h-6 text-neon-cyan" />
          <h1 className="font-(family-name:--font-orbitron) text-2xl sm:text-3xl font-black text-foreground">
            PRIVACY POLICY
          </h1>
        </div>
        <p className="text-xs text-muted-foreground/70 mb-12 tracking-wide">
          Effective date: {EFFECTIVE_DATE}
        </p>

        <Section title="Who We Are">
          <p>
            CodeEscape is an independent, student-run project. It is not operated by a registered
            company. If you have questions about this policy or your data, contact{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-neon-cyan hover:underline">
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </Section>

        <Section title="Information We Collect">
          <p><strong className="text-foreground">Account information.</strong> When you sign up, we collect your email address (used for passwordless sign-in) and a display name you choose. You can optionally set a profile display name and avatar color afterward.</p>
          <p><strong className="text-foreground">Gameplay data.</strong> To run the game and show you results, we store team names and invite codes, session and room data, the answers you submit to puzzles, whether they were correct, hints used, and time taken. For GMAT-style practice tests we also store your scores and the specific questions you got wrong, including the question text and your selected answer, so you can review them later.</p>
          <p><strong className="text-foreground">Skill/performance profile.</strong> We calculate and store a per-topic skill estimate based on your attempt history, used to track your progress.</p>
          <p><strong className="text-foreground">Technical &amp; usage data.</strong> We log page visits (path, referring page, and browser user-agent) tied to an anonymous, randomly generated visitor ID stored in a cookie — not to your account — so we can see aggregate traffic. We also briefly use your IP address to enforce rate limits on our servers; it is not stored long-term.</p>
          <p><strong className="text-foreground">Local storage.</strong> Your browser may temporarily cache an in-progress test result locally if it fails to save to our servers, purely so it can retry the save. We also store your light/dark theme preference locally.</p>
        </Section>

        <Section title="How We Use Your Information">
          <ul className="list-disc list-inside space-y-1">
            <li>To create and secure your account and let you sign in</li>
            <li>To run games, teams, and leaderboards</li>
            <li>To score your attempts and show you your results and progress over time</li>
            <li>To power the in-game AI teammate/hint features, which read the current puzzle and your submitted answer or chat message in order to generate a relevant response</li>
            <li>To monitor site traffic in aggregate and prevent abuse (rate limiting)</li>
          </ul>
          <p>We do not sell your data, and we do not use it for advertising.</p>
        </Section>

        <Section title="Who We Share Data With">
          <p>We use a small number of infrastructure providers to run the app. They process data on our behalf under their own terms and security practices:</p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong className="text-foreground">Supabase</strong> — authentication (email, session) and database hosting</li>
            <li><strong className="text-foreground">Groq</strong> — powers the AI teammate/hint chat. Requests include the puzzle content and the text you type into chat or submit as an answer, but not your name, email, or account ID</li>
            <li><strong className="text-foreground">Upstash</strong> — receives your IP address transiently to apply rate limits</li>
            <li><strong className="text-foreground">Vercel</strong> — hosts the application</li>
          </ul>
          <p>We do not share your data with advertisers, data brokers, or any other third party outside of what&apos;s needed to operate the service above.</p>
        </Section>

        <Section title="Cookies">
          <p>We use one first-party cookie (<code className="text-xs bg-white/5 px-1 py-0.5 rounded">ce_vid</code>) to count unique visitors anonymously, and your session cookie from Supabase to keep you signed in. We don&apos;t use third-party advertising or tracking cookies.</p>
        </Section>

        <Section title="Data Retention">
          <p>We keep your account and gameplay data for as long as your account is active, so your history and progress remain available to you. Anonymous page-view logs and rate-limit data are kept only briefly and aren&apos;t linked to your identity.</p>
        </Section>

        <Section title="Your Rights">
          <p>You can update your display name and avatar from your profile page at any time. To request a copy of your data or to have your account and associated data deleted, email{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-neon-cyan hover:underline">
              {CONTACT_EMAIL}
            </a>{" "}
            and we&apos;ll action it promptly.
          </p>
        </Section>

        <Section title="Children's Privacy">
          <p>CodeEscape is intended for students and adults preparing for standardized tests and technical interviews, and is not directed at children under 16. We don&apos;t knowingly collect data from children under that age.</p>
        </Section>

        <Section title="Changes to This Policy">
          <p>If this policy changes, we&apos;ll update the effective date above. Continued use of CodeEscape after a change means you accept the updated policy.</p>
        </Section>

        <Section title="Contact">
          <p>
            Questions, data requests, or concerns:{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-neon-cyan hover:underline">
              {CONTACT_EMAIL}
            </a>
          </p>
        </Section>

        <div className="pt-6 border-t border-dark-border">
          <Link href="/" className="text-xs text-muted-foreground hover:text-neon-cyan transition-colors">
            ← Back to home
          </Link>
        </div>
      </main>
    </>
  );
}
