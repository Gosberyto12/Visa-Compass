import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "VisaCompassAfrica — Know Before You Go",
    template: "%s | VisaCompassAfrica",
  },
  description:
    "Explore source-aware visa information, entry conditions, and travel preparation guidance.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
