import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Sunset Predictor App - Nightfalls | Real-Time Golden Hour & Weather",
  description:
    "Use Nightfalls interactive sunset predictor to get real-time sunset times, golden hour calculations, weather forecasts, and sunset quality predictions for any location worldwide.",
  keywords:
    "sunset predictor, golden hour calculator, sunset app, weather forecast, sunset quality, photography planner, sunset timer, golden hour app, sunset tracker, photography weather",
  alternates: {
    canonical: "/App",
  },
  openGraph: {
    title: "Sunset Predictor App - Real-Time Golden Hour & Weather Forecasts",
    description:
      "Get instant sunset predictions, golden hour timing, and weather forecasts for perfect photography planning.",
    url: "https://www.nightfalls.ca/App",
  },
};

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}