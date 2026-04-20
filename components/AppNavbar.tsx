"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

const NAV_LINKS = [
  { href: "/daily",   label: "Daily",   icon: "📅" },
  { href: "/goals",   label: "Goals",   icon: "🎯" },
  { href: "/weekly",  label: "Weekly",  icon: "📊" },
  { href: "/monthly", label: "Monthly", icon: "🗓️" },
];

// Pages that render their own header or no header at all
const HIDDEN_ON = ["/", "/login", "/register"];

export default function AppNavbar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  if (HIDDEN_ON.includes(pathname)) return null;

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6 py-3">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group flex-shrink-0">
          <Image
            src="/logo.png"
            alt="Logo"
            width={30}
            height={30}
            className="drop-shadow-[0_0_8px_rgba(37,99,235,0.55)] transition-transform group-hover:scale-110"
          />
          <span className="hidden sm:block text-sm font-black tracking-tight text-white">
            Blue<span className="text-blue-500">Lock</span>
          </span>
        </Link>

        {/* Page nav */}
        <nav className="flex items-center gap-1">
          {NAV_LINKS.map(({ href, label, icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                  active
                    ? "bg-blue-600/15 text-blue-400"
                    : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                }`}
              >
                <span className="text-base leading-none">{icon}</span>
                <span className="hidden sm:inline">{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User + sign-out */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {session?.user?.email && (
            <span className="hidden md:block text-xs text-zinc-500 truncate max-w-[140px]">
              {session.user.email}
            </span>
          )}
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-400 transition-colors hover:border-red-700/60 hover:text-red-400"
          >
            Sign out
          </button>
        </div>

      </div>
    </header>
  );
}
