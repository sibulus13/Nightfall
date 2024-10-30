import "~/styles/globals.css";

import { GeistSans } from "geist/font/sans";
import { type Metadata } from "next";
import Navbar from "~/components/navbar";
import Footer from "~/components/footer";

export const metadata: Metadata = {
  title: "Nightfall | Sunset Quality Forecast",
  description: "A dashboard for predicting weekly sunset quality",
  icons: [{ rel: "icon", url: "/icon.ico" }],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${GeistSans.variable}`}>
      <body>
        <Navbar />
        <div className="m-2">{children}</div>
        <Footer />
      </body>
    </html>
  );
}
