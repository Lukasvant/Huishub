"use client";

import {
  CalendarDays,
  CheckSquare,
  Home,
  MoreHorizontal,
  ShoppingBasket,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useHousehold } from "@/contexts/household-context";
import { Button } from "@/components/ui";
import clsx from "clsx";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/tasks", label: "Taken", icon: CheckSquare },
  { href: "/groceries", label: "Boodschappen", icon: ShoppingBasket },
  { href: "/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/settings/household", label: "Meer", icon: MoreHorizontal },
];

function NavItem({
  href,
  label,
  icon: Icon,
  mobile = false,
}: (typeof links)[number] & { mobile?: boolean }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      className={clsx(
        "flex items-center transition",
        mobile
          ? "min-w-0 flex-1 flex-col gap-1 py-2 text-[11px]"
          : "gap-3 rounded-xl px-3 py-3 text-sm",
        active
          ? mobile
            ? "text-sage-600"
            : "bg-sage-50 font-medium text-sage-600"
          : "text-muted hover:text-ink",
      )}
    >
      <Icon className="h-5 w-5" />
      <span className="truncate">{label}</span>
    </Link>
  );
}

export function AppChrome({ children }: { children: ReactNode }) {
  const { household, member } = useHousehold();
  const { logout } = useAuth();
  const role =
    member?.role === "admin"
      ? "Beheerder"
      : member?.role === "partner"
        ? "Partner"
        : "Alleen lezen";

  return (
    <div className="min-h-screen md:flex">
      <aside className="hidden w-64 shrink-0 border-r border-stone-200 bg-white px-4 py-6 md:flex md:flex-col">
        <Link href="/dashboard" className="mb-8 px-3">
          <p className="text-xl font-semibold tracking-tight">HuisHub</p>
          <p className="mt-1 truncate text-sm text-muted">{household?.name}</p>
        </Link>
        <nav className="space-y-1">
          {links.map((link) => (
            <NavItem key={link.href} {...link} />
          ))}
        </nav>
        <div className="mt-auto border-t border-stone-100 px-3 pt-4">
          <p className="text-xs text-muted">{role}</p>
          <Button
            variant="ghost"
            className="mt-2 w-full justify-start px-0"
            onClick={() => logout()}
          >
            Uitloggen
          </Button>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <div className="mx-auto max-w-5xl px-4 pb-24 pt-5 sm:px-6 md:pb-8 md:pt-8">
          {children}
        </div>
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-stone-200 bg-white/95 px-2 backdrop-blur md:hidden">
        {links.map((link) => (
          <NavItem key={link.href} {...link} mobile />
        ))}
      </nav>
    </div>
  );
}
