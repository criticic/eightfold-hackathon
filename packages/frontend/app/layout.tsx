// "use client";

import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
// import { usePathname } from "next/navigation";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>TruthTalent - Authentic Hiring Platform</title>
        <meta name="description" content="Connect talent with opportunity through transparent, skills-based hiring" />
      </head>
      <body className="antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
