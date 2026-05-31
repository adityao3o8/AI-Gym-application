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
    <nav className="font-inter flex items-center gap-0.5 rounded-full glass-pill px-1.5 py-1.5">
      {allNav.map((item) => {
        const isActive =
          pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "relative rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-white/10 text-white"
                : "text-white/65 hover:bg-white/8 hover:text-white"
            )}
          >
            {item.label}
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
        className="fixed left-1/2 top-4 z-50 w-[min(96vw,74rem)] -translate-x-1/2 rounded-full border border-white/10 px-4 py-2.5 shadow-[0_20px_60px_rgba(0,0,0,0.5)] backdrop-blur-2xl"
      >
        <div className="mx-auto flex items-center justify-between gap-3">
        <Link
          href="/"
          className="font-manrope flex shrink-0 items-center gap-2 text-lg font-semibold tracking-tight"
        >
          <span className="relative grid size-8 place-items-center rounded-lg bg-gradient-to-br from-[#7b39fc] to-[#9759ff] shadow-[0_0_20px_rgba(123,57,252,0.55)]">
            <Dumbbell className="size-4 text-white" />
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
                  className="inline-flex size-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/90 transition hover:bg-white/10 hover:text-white"
                >
                  <UserIcon className="size-4" />
                </Link>
                <form action={signOutAction}>
                  <Button
                    type="submit"
                    variant="ghost"
                    size="sm"
                    className="font-inter rounded-full text-white/85"
                  >
                    Log out
                  </Button>
                </form>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="font-inter rounded-full text-white/85"
                  render={<Link href="/login" />}
                >
                  Log in
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  className="font-inter rounded-full"
                  render={<Link href="/signup" />}
                >
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
