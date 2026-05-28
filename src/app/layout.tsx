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
          <nav className="site-nav" aria-label="Primary navigation">
            <Link href="/">Candidates</Link>
            <Link href="/races">Races</Link>
            <Link href="/committees">PACs/orgs</Link>
          </nav>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
