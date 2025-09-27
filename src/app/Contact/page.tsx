import Link from "next/link";
import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Nightfalls - Sunset Prediction App Support & Feedback",
  description:
    "Contact Nightfalls for support, feedback, or inquiries about sunset predictions, golden hour timing, and photography planning. Get help with our sunset forecasting app.",
  keywords:
    "contact nightfalls, sunset app support, sunset prediction help, golden hour app contact, photography app support, sunset forecasting feedback",
  alternates: {
    canonical: "/Contact",
  },
  openGraph: {
    title: "Contact Nightfalls - Sunset Prediction App Support",
    description:
      "Contact us for support, feedback, or inquiries about sunset predictions and golden hour timing.",
    url: "https://www.nightfalls.ca/Contact",
  },
};

export default function ContactPage() {
  return (
    <div className="page">
      <h1 className="text-4xl font-bold">Contact</h1>
      <p className="text-lg">
        For any inquiries, questions, feedback, or bug report, please contact me
        at:{" "}
        <Link className="underline" href="mailto:info@si8tech.com">
          info@si8tech.com
        </Link>
      </p>
    </div>
  );
}
