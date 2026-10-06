import { Suspense } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Award,
  BookOpenCheck,
  CheckCircle2,
  FileText,
  Library,
  ListChecks,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { MissionCard } from "@/components/cards/mission-card";
import { hasIssuedEmployeeCertificate } from "@/services/certificates/certificate.service";
import { getLessonContent } from "@/services/policy.service";

const lessonContent = getLessonContent();

const learningSteps = [
  { label: "Review the safety lesson", href: "/lesson", number: "01" },
  { label: "Complete the knowledge check", href: "/quick-check", number: "02" },
  { label: "Apply your learning in a scenario", href: "/scenario", number: "03" },
];

async function CertificateProgress() {
  const hasIssuedCertificate = await hasIssuedEmployeeCertificate();

  return (
    <div className="mt-5 flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#3d6f17] shadow-sm">
          <Award size={19} />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-800">Certificates</p>
          <p className="mt-0.5 text-xs text-slate-500">
            {hasIssuedCertificate ? "An issued certificate is available" : "No issued certificate yet"}
          </p>
        </div>
      </div>
      <Link
        href="/certificates"
        aria-label="View certificates"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-white hover:text-[#315a12]"
      >
        <ArrowRight size={17} />
      </Link>
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  icon: Icon,
  headingId,
}: {
  eyebrow: string;
  title: string;
  icon: typeof Activity;
  headingId?: string;
}) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eaf4dc] text-[#315a12]">
        <Icon size={18} />
      </span>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{eyebrow}</p>
        <h2 id={headingId} className="mt-0.5 text-lg font-semibold tracking-tight text-slate-900">{title}</h2>
      </div>
    </div>
  );
}

export default function TodayPage() {
  return (
    <AppShell title="Home" description="Your workplace safety, at a glance">
      <div className="space-y-8">
        <section aria-label="Welcome">
          <p className="text-sm font-medium text-[#47751d]">Employee workspace</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Your safety learning, all in one place.
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
            Find your assigned learning, continue a lesson, and keep your safety record close.
          </p>
        </section>

        <MissionCard />

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(18rem,0.7fr)]">
          <section aria-labelledby="tasks-title" className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <SectionHeading eyebrow="Learning path" title="Today's tasks" icon={ListChecks} headingId="tasks-title" />
            <p className="mb-4 text-sm text-slate-500">
              Continue through the available safety learning activities. Completion status is not currently available here.
            </p>
            <ol className="space-y-2">
              {learningSteps.map((step) => (
                <li key={step.href}>
                  <Link
                    href={step.href}
                    className="group flex min-h-14 items-center gap-3 rounded-2xl border border-slate-100 px-3 py-3 transition hover:border-[#d4e9b4] hover:bg-[#f8fbf4] sm:px-4"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-500 group-hover:bg-[#eaf4dc] group-hover:text-[#315a12]">
                      {step.number}
                    </span>
                    <span className="flex-1 text-sm font-medium text-slate-800">{step.label}</span>
                    <ArrowRight size={16} className="shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-[#315a12]" />
                  </Link>
                </li>
              ))}
            </ol>
          </section>

          <section id="progress" aria-labelledby="progress-title" className="scroll-mt-28 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <SectionHeading eyebrow="Personal safety" title="Your progress" icon={CheckCircle2} headingId="progress-title" />
            <p className="text-sm leading-6 text-slate-600">
              Your personal learning record belongs here. Only verified certificate information is available to display right now.
            </p>
            <Suspense
              fallback={
                <div role="status" className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                  Loading certificate status...
                </div>
              }
            >
              <CertificateProgress />
            </Suspense>
            <p className="mt-4 text-xs leading-5 text-slate-500">
              Mission history, XP, and streak totals are not shown until real employee progress data is available.
            </p>
          </section>
        </div>

        <section aria-labelledby="learning-title">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <SectionHeading eyebrow="Pick up where you left off" title="Continue learning" icon={BookOpenCheck} headingId="learning-title" />
            <Link href="/lesson" className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-[#315a12] hover:text-[#203b0c]">
              View all
              <ArrowRight size={16} />
            </Link>
          </div>
          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#eaf4dc] text-[#315a12]">
                <BookOpenCheck size={26} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#47751d]">Available lesson</p>
                <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">{lessonContent.title}</h2>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{lessonContent.summary}</p>
              </div>
              <Link href="/lesson" className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#9bdc28] px-4 py-2.5 text-sm font-semibold text-[#102a43] transition hover:bg-[#b6eb6f]">
                Continue
                <ArrowRight size={16} />
              </Link>
            </div>
          </article>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <section aria-labelledby="activity-title" className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <SectionHeading eyebrow="Your learning history" title="Recent activity" icon={Activity} headingId="activity-title" />
            <p className="rounded-2xl bg-slate-50 px-4 py-5 text-sm leading-6 text-slate-600">
              Activity history will appear here when it is available for your account.
            </p>
          </section>
          <section aria-labelledby="badges-title" className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <SectionHeading eyebrow="Achievements" title="Your badges" icon={Award} headingId="badges-title" />
            <p className="rounded-2xl bg-slate-50 px-4 py-5 text-sm leading-6 text-slate-600">
              Achievement records and badges will appear here when they are available for your account.
            </p>
          </section>
        </div>

        <section id="resources" aria-labelledby="resources-title" className="scroll-mt-28">
          <SectionHeading eyebrow="Useful shortcuts" title="Quick resources" icon={Library} headingId="resources-title" />
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { title: "Safety lesson", detail: "Review available guidance", href: "/lesson", icon: BookOpenCheck },
              { title: "Knowledge check", detail: "Test your understanding", href: "/quick-check", icon: CheckCircle2 },
              { title: "Certificates", detail: "Open your compliance record", href: "/certificates", icon: FileText },
            ].map((resource) => (
              <Link
                key={resource.href}
                href={resource.href}
                className="flex min-h-20 items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-[#d4e9b4] hover:shadow-sm"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-[#315a12]">
                  <resource.icon size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-slate-800">{resource.title}</span>
                  <span className="mt-0.5 block text-xs text-slate-500">{resource.detail}</span>
                </span>
                <ArrowRight size={16} className="shrink-0 text-slate-400" />
              </Link>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
