import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CyberBench SOC",
  description: "Multi-agent cybersecurity incident evaluation & RL training dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className="h-full grid-bg" style={{ background: "var(--bg)" }}>
        {children}
      </body>
    </html>
  );
}
