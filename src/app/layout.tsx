import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "watplace",
  description: "A collaborative pixel canvas for University of Waterloo students",
  openGraph: {
    title: "watplace",
    description: "A collaborative pixel canvas for UWaterloo students",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
