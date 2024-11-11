import "~/styles/globals.css";

import { GeistSans } from "geist/font/sans";
import GoogleTagManager from "@magicul/next-google-tag-manager";
import { type Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import Navbar from "~/components/navbar";
import Footer from "~/components/footer";
import { ThemeProvider } from "~/components/themeProvider";
import StoreProvider from "./StoreProvider";
import { env } from "process";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Nightfall | Sunset Quality Forecast",
  description: "A dashboard for predicting weekly sunset quality",
  icons: [{ rel: "icon", url: "/icon.ico" }],
};

const NEXT_PUBLIC_GOOGLE_TAG_ID = env.NEXT_PUBLIC_GOOGLE_TAG_ID!;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${GeistSans.variable}`}>
      <body>
        <Suspense>
          <GoogleTagManager id={NEXT_PUBLIC_GOOGLE_TAG_ID} />
        </Suspense>
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
            <Analytics />
          </StoreProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
