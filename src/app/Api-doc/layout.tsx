import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "API Documentation - Nightfalls | Sunset Prediction API for Developers",
  description:
    "Access Nightfalls sunset prediction API for developers. Integrate sunset timing, golden hour calculations, and sunset quality forecasting into your applications.",
  keywords:
    "sunset API, sunset prediction API, golden hour API, weather API, photography API, sunset forecast API, developer tools, nightfalls API",
  alternates: {
    canonical: "/Api-doc",
  },
  openGraph: {
    title: "Nightfalls API - Sunset Prediction for Developers",
    description:
      "Integrate sunset predictions and golden hour timing into your applications with our developer API.",
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