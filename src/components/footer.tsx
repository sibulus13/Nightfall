import Link from "next/link";

const footerLinks = [
  { href: "/Privacy", label: "Privacy" },
  { href: "/Contact", label: "Contact" },
  { href: "/About", label: "About" },
  { href: "/locations/vancouver-bc", label: "Guides" },
  { href: "/llms.txt", label: "LLMs" },
];

export default function Footer() {
  return (
    <footer className="border-t bg-background px-4 py-6 text-sm">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="font-black">Nightfalls</div>
          <div className="text-xs text-muted-foreground">
            Sunset forecasts, scouting guides, and photo planning.
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          {footerLinks.map((link) => (
            <Link
              key={link.href}
              className="font-semibold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              href={link.href}
            >
              {link.label}
            </Link>
          ))}
          <a
            className="font-semibold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            href="https://github.com/sibulus13/Nightfall"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
