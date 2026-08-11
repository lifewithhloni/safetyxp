"use client";

import { motion } from "framer-motion";
import { Sparkles, Clock3, CalendarRange } from "lucide-react";

type PlannerProps = {
  planner: {
    estimatedLearning: string;
    availableDays: number;
    dailyLearning: string;
  };
};

const schedule = [
  { day: "Mon", title: "Lesson", accent: "bg-[#eff5ff] text-[#0b3d91]" },
  { day: "Tue", title: "Lesson", accent: "bg-[#eff5ff] text-[#0b3d91]" },
  { day: "Wed", title: "Quiz", accent: "bg-[#fff7e6] text-[#a15b00]" },
  { day: "Thu", title: "Scenario", accent: "bg-[#eff9f3] text-[#157f4a]" },
  { day: "Fri", title: "Review", accent: "bg-[#f6f2ff] text-[#6b3dd4]" },
];

export function AILearningPlanner({ planner }: PlannerProps) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[#0b3d91]">
            <Sparkles className="h-4 w-4" />
            <h3 className="text-xl font-semibold text-slate-900">AI learning planner</h3>
          </div>
          <p className="mt-2 text-sm text-slate-600">The planner is generating a calm, high-signal learning journey from the uploaded policy.</p>
        </div>
        <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-medium text-slate-700">Mock AI processing</div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Clock3 className="h-4 w-4 text-[#0b3d91]" />
            Recommendations
          </div>
          <div className="mt-4 space-y-3">
            <div className="rounded-2xl bg-white p-3">
              <p className="text-sm text-slate-500">Document</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">42 pages</p>
            </div>
            <div className="rounded-2xl bg-white p-3">
              <p className="text-sm text-slate-500">Estimated learning</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{planner.estimatedLearning}</p>
            </div>
            <div className="rounded-2xl bg-white p-3">
              <p className="text-sm text-slate-500">Available days</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{planner.availableDays}</p>
            </div>
            <div className="rounded-2xl bg-white p-3">
              <p className="text-sm text-slate-500">Recommended daily learning</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{planner.dailyLearning}</p>
            </div>
          </div>
        </div>

        <div className="rounded-[20px] border border-slate-200 bg-[#f9fbff] p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <CalendarRange className="h-4 w-4 text-[#0b3d91]" />
            Calendar preview
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {schedule.map((item) => (
              <motion.div key={item.day} whileHover={{ y: -2 }} className="rounded-2xl border border-slate-200 bg-white p-3 text-center">
                <p className="text-sm font-semibold text-slate-900">{item.day}</p>
                <div className={`mt-3 rounded-full px-3 py-2 text-sm font-medium ${item.accent}`}>{item.title}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
