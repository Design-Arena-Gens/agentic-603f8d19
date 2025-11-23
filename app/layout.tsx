export const metadata = {
  title: "3 Fast Morning Stretches (Yoga)",
  description: "Animated instructional video generator",
};

import "./globals.css";
import React from "react";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
