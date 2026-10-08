import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import { SiteHeader } from "./site-header";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Caption the City",
  description: "Post NYC photos, get AI captions, vote on the best ones.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${nunito.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col overflow-x-hidden">
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
