"use client";

import { useState } from "react";
import { getQuizQuestion } from "@/services/quiz.service";
import { CheckCircle2 } from "lucide-react";

export function QuizForm() {
  const [selected, setSelected] = useState<string | null>(null);
  const question = getQuizQuestion();
  const feedback = question.options.find((option) => option.id === selected)?.feedback;

  return (
    <div>
      <h2 className="text-2xl font-semibold text-slate-900">{question.prompt}</h2>
      <div className="mt-6 grid gap-3">
        {question.options.map((option) => {
          const isSelected = selected === option.id;
          return (
            <button
              key={option.id}
              onClick={() => setSelected(option.id)}
              className={`rounded-[20px] border px-4 py-4 text-left text-sm font-medium transition ${
                isSelected ? "border-[#0b3d91] bg-[#eef4ff] text-[#0b3d91]" : "border-slate-200 bg-white text-slate-700"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      {feedback && (
        <div className="mt-6 flex items-start gap-2 rounded-[20px] border border-[#d8e7ff] bg-[#f5f9ff] p-4 text-sm text-slate-700">
          <CheckCircle2 size={18} className="mt-0.5 text-[#1565c0]" />
          <p>{feedback}</p>
        </div>
      )}
    </div>
  );
}
