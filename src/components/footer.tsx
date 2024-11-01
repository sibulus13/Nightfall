import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mx-2 flex justify-center border-t p-2">
      <p>© 2021 Nightfall</p>
      <div>
        <Link className="mx-2 underline" href="/Privacy">
          Privacy
        </Link>
        <Link className="mx-2 underline" href="/Contact">
          Contact
        </Link>
      </div>
      {/* TODO add other sections such as contact, about, privacy, feature request, terms of service */}
    </footer>
  );
}
