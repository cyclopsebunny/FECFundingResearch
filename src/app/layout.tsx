import type { Metadata } from "next";
import Link from "next/link";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "FEC Funding Research",
  description: "Private candidate funding analysis using official FEC data.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <header className="site-header no-print">
          <Link href="/" className="brand">
            FEC Funding Research
          </Link>
          <p className="privacy-label">Private research tool</p>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}

