import Image from "next/image";
import Link from "next/link";
import { BookOpen, MapPin } from "lucide-react";
import { ModeToggle } from "./darkModeToggle";

const navLinks = [
  { href: "/locations/vancouver-bc", label: "Guides" },
  { href: "/FAQ", label: "FAQ" },
  { href: "/Api-doc", label: "API" },
];

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-40 border-b bg-background/92 px-3 py-2 backdrop-blur md:px-6">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-md border bg-card">
            <Image
              src="/favicon.png"
              alt="Nightfalls"
              width={26}
              height={26}
              priority
            />
          </span>
          <span>
            <span className="block text-sm font-black leading-none">
              Nightfalls
            </span>
            <span className="hidden text-[10px] font-semibold uppercase text-muted-foreground sm:block">
              Sunset field guide
            </span>
          </span>
        </Link>

        <div className="flex items-center gap-1 md:gap-2">
          <div className="hidden items-center rounded-md border bg-card/60 p-1 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded px-3 py-1.5 text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </div>
          <Link
            href="/App"
            className="nf-button-primary hidden px-3 py-2 sm:inline-flex"
          >
            <MapPin className="h-4 w-4" />
            Open Planner
          </Link>
          <Link
            href="/locations/vancouver-bc"
            className="nf-icon-button md:hidden"
            aria-label="Open sunset guides"
            title="Open sunset guides"
          >
            <BookOpen className="h-4 w-4" />
          </Link>
          <ModeToggle />
        </div>
      </div>
    </nav>
  );
}
