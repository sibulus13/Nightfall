import Link from "next/link";

export default function Footer() {
  return (
    <footer className="flex flex-col items-center justify-center border-t px-2 py-4 md:flex-row md:justify-evenly">
      <p>© 2024 Nightfalls</p>
      <div className="flex gap-2">
        <Link className="mx-2 underline" href="/Privacy">
          Privacy
        </Link>
        <Link className="mx-2 underline" href="/Contact">
          Contact
        </Link>
        <Link className="mx-2 underline" href="/About">
          About
        </Link>
        <a
          className="mx-2 underline"
          href="https://github.com/sibulus13/Nightfall"
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub
        </a>
      </div>
      {/* TODO: Add feature request, terms of service */}
    </footer>
  );
}
