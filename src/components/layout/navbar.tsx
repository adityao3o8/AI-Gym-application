"use client";

import { AnimatePresence, motion, useScroll, useTransform } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dumbbell, Menu, User as UserIcon, X } from "lucide-react";
import { useState } from "react";

import { APP_NAME, MEMBER_NAV, OWNER_NAV } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const allNav = [...MEMBER_NAV, ...OWNER_NAV];

export type NavbarProps = {
  isAuthenticated: boolean;
  signOutAction: () => Promise<void>;
};

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-1">
      {allNav.map((item) => {
        const isActive =
          pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "relative rounded-lg px-3 py-2 text-sm font-medium text-white/70 transition-colors hover:text-white",
              isActive
                ? "text-white"
                : "hover:bg-white/5"
            )}
          >
            {item.label}
            {isActive ? (
              <span className="absolute -bottom-1 left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-white" />
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

const menuVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
};

const menuItemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0 },
};

export function Navbar({ isAuthenticated, signOutAction }: NavbarProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const { scrollY } = useScroll();
  const navBackground = useTransform(
    scrollY,
    [0, 120],
    ["rgba(255,255,255,0.05)", "rgba(0,0,0,0.42)"]
  );
  const isAuthRoute = pathname === "/login" || pathname === "/signup";

  if (isAuthRoute) return null;

  return (
    <>
      <motion.header
        style={{ backgroundColor: navBackground }}
        className="fixed left-1/2 top-4 z-50 w-[min(96vw,74rem)] -translate-x-1/2 rounded-full border border-white/10 px-4 py-3 shadow-[0_20px_60px_rgba(0,0,0,0.5)] backdrop-blur-2xl"
      >
        <div className="mx-auto flex items-center justify-between gap-3">
        <Link href="/" className="flex shrink-0 items-center gap-2 font-semibold tracking-tight">
          <span className="flex size-9 items-center justify-center rounded-lg bg-white/10 text-white">
            <Dumbbell className="size-5" />
          </span>
          <span className="hidden text-white sm:inline">{APP_NAME}</span>
        </Link>

        <div className="hidden flex-1 justify-center md:flex">
          <NavLinks />
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <div className="hidden items-center gap-2 sm:flex">
            {isAuthenticated ? (
              <>
                <Link
                  href="/profile"
                  aria-label="Profile"
                  className="inline-flex size-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/90 transition hover:bg-white/10"
                >
                  <UserIcon className="size-4" />
                </Link>
                <form action={signOutAction}>
                  <Button type="submit" variant="ghost" size="sm" className="text-white/90">
                    Log out
                  </Button>
                </form>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white/90"
                  render={<Link href="/login" />}
                >
                  Log in
                </Button>
                <Button variant="primary" size="sm" render={<Link href="/signup" />}>
                  Sign up
                </Button>
              </>
            )}
          </div>
          <button
            type="button"
            className="inline-flex size-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white md:hidden"
            aria-label="Open menu"
            onClick={() => setIsOpen((prev) => !prev)}
          >
            {isOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
        </div>
      </motion.header>

      <AnimatePresence>
        {isOpen ? (
          <motion.div
            key="mobile-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/80 backdrop-blur-2xl md:hidden"
          >
            <motion.div
              variants={menuVariants}
              initial="hidden"
              animate="visible"
              className="flex h-full flex-col justify-center gap-4 px-6"
            >
              {allNav.map((item) => (
                <motion.div key={item.href} variants={menuItemVariants}>
                  <Link
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className="block rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-lg font-medium text-white"
                  >
                    {item.label}
                  </Link>
                </motion.div>
              ))}
              <motion.div variants={menuItemVariants} className="mt-4">
                {isAuthenticated ? (
                  <form action={signOutAction}>
                    <Button type="submit" variant="ghost" className="w-full">
                      Log out
                    </Button>
                  </form>
                ) : (
                  <div className="flex gap-3">
                    <Button variant="ghost" className="flex-1" render={<Link href="/login" />}>
                      Log in
                    </Button>
                    <Button
                      variant="primary"
                      className="flex-1"
                      render={<Link href="/signup" />}
                    >
                      Sign up
                    </Button>
                  </div>
                )}
              </motion.div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
