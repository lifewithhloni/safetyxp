"use client";

import Link from "next/link";

export function ContinueButton() {
  return (
    <Link
      href="/today"
      className="inline-flex items-center justify-center rounded-full bg-[#0b3d91] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#083069]"
    >
      Continue to Deadline
    </Link>
  );
}
