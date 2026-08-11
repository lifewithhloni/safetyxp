import { AppShell } from "@/components/layout/app-shell";
import { MissionCard } from "@/components/cards/mission-card";

export default function TodayPage() {
  return (
    <AppShell title="Today" description="Your daily mission is ready">
      <div className="mx-auto max-w-3xl">
        <MissionCard />
      </div>
    </AppShell>
  );
}
