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

export const metadata: Metadata = {
  title: "Nightfalls | Sunset Quality Forecast",
  description: "A dashboard for predicting weekly sunset quality",
  icons: [{ rel: "icon", url: "/icon.ico" }],
};

const NEXT_PUBLIC_GOOGLE_TAG_ID = env.NEXT_PUBLIC_GOOGLE_TAG_ID;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${GeistSans.variable}`}>
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
      {/* TODO google analytics isn't set up properly */}
    </html>
  );
}
