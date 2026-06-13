import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Nightfalls API Waitlist",
  description:
    "Join the Nightfalls API waitlist for future access to sunset forecasts, golden hour timing, location recommendations, and phase-aware photo planning data.",
  keywords:
    "nightfalls api waitlist, sunset API, golden hour API, sunset forecast API, photography planning API",
  alternates: {
    canonical: "/Api-doc",
  },
  openGraph: {
    title: "Nightfalls API Waitlist",
    description:
      "Join the waitlist for future developer access to Nightfalls sunset planning data.",
    url: "https://www.nightfalls.ca/Api-doc",
  },
};

export default function ApiLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
