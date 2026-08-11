import Link from "next/link";

export function PrimaryButton({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center rounded-full bg-[#0b3d91] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#083069]"
    >
      {children}
    </Link>
  );
}
