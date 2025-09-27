import "./globals.css";

import { GeistSans } from "geist/font/sans";
import { type Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import Navbar from "~/components/navbar";
import Footer from "~/components/footer";
import { ThemeProvider } from "~/components/themeProvider";
import StoreProvider from "./StoreProvider";
import { env } from "~/env";
import { GoogleAnalytics } from "@next/third-parties/google";
import { OrganizationSchema, WebSiteSchema, WebApplicationSchema } from "~/components/StructuredData";

export const metadata: Metadata = {
  title: "Nightfalls - Best Sunset Times & Golden Hour Predictions Worldwide",
  description:
    "Find the perfect sunset times, golden hour predictions, and sunset quality forecasts for any location worldwide. Get weekly sunset scores, photography timing, and weather conditions to capture stunning sunset photos.",
  keywords:
    "sunset times, golden hour, sunset predictions, sunset photography, sunset forecast, best sunset locations, sunset quality, sunset score, sunset timing, sunset weather, sunset app, sunset calculator, sunset finder, sunset planner, sunset photography tips, sunset colors, sunset viewing, sunset spots, sunset schedule, sunset calendar, sunset tracker",
  authors: [{ name: "Nightfalls" }],
  creator: "Nightfalls",
  publisher: "Nightfalls",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL("https://www.nightfalls.ca"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Nightfalls - Best Sunset Times & Golden Hour Predictions Worldwide",
    description:
      "Find the perfect sunset times, golden hour predictions, and sunset quality forecasts for any location worldwide. Get weekly sunset scores, photography timing, and weather conditions to capture stunning sunset photos.",
    url: "https://www.nightfalls.ca",
    siteName: "Nightfalls",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Nightfalls - Sunset Quality Forecast",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Nightfalls - Best Sunset Times & Golden Hour Predictions Worldwide",
    description:
      "Find the perfect sunset times, golden hour predictions, and sunset quality forecasts for any location worldwide.",
    images: ["/og-image.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: [{ rel: "icon", url: "/icon.ico" }],
};

const NEXT_PUBLIC_GOOGLE_TAG_ID = env.NEXT_PUBLIC_GOOGLE_TAG_ID;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${GeistSans.variable}`}>
      <head>
        <OrganizationSchema />
        <WebSiteSchema />
        <WebApplicationSchema />
      </head>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <StoreProvider>
            <Navbar />
            {children}
            <Footer />
          </StoreProvider>
        </ThemeProvider>
      </body>
      <Analytics />
      {NEXT_PUBLIC_GOOGLE_TAG_ID && (
        <GoogleAnalytics gaId={NEXT_PUBLIC_GOOGLE_TAG_ID} />
      )}
      {/* TODO: Setup Google Analytics */}
    </html>
  );
}
