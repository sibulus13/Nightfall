import Link from "next/link";
export default function ContactPage() {
  return (
    <div className="page">
      <h1 className="text-4xl font-bold">Contact</h1>
      <p className="text-lg">
        For any inquiries, questions, feedback, or bug report, please contact me
        at:{" "}
        <Link
          className="underline"
          href="mailto:chengjie.michael.huang@gmail.com"
        >
          chengjie.michael.huang@gmail.com
        </Link>
      </p>
    </div>
  );
}
