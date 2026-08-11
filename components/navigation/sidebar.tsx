import Link from "next/link";
import { usePathname } from "next/navigation";
import { employeeNavItems } from "@/constants";
import { Home, BookOpenCheck, FileText, User, ShieldCheck } from "lucide-react";

const icons = [Home, BookOpenCheck, FileText, User, ShieldCheck];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-2 overflow-x-auto pb-1">
      {employeeNavItems.map((item, index) => {
        const Icon = icons[index];
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex shrink-0 items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition ${
              active ? "bg-[#0b3d91] text-white" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Icon size={16} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
