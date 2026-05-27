import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CommandGrid",
  description: "Enterprise AI Operations Command Center by HexIT Labs"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
