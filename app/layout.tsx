import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";

import { GlobalErrorBoundary } from "@/components/global-error-boundary";
import { Toaster } from "sonner";
import "./globals.css";

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Changelog Generator",
  description:
    "A changelog generator for your public repo, that uses AI to generate changelogs based on your Pull request history.",
  openGraph: {
    title: "Changelog Generator",
    description:
      "A changelog generator for your public repo, that uses AI to generate changelogs based on your Pull request history.",
    url: "https://changelog-generator-rho.vercel.app/",
    siteName: "Changelog Generator",
    images: [
      {
        url: "https://changelog-generator-rho.vercel.app/og.png",
        width: 1200,
        height: 630,
        alt: "Changelog Generator",
      },
    ],
    locale: "en-US",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="32x32" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link
          rel="icon"
          href="/favicon-96x96.png"
          sizes="96x96"
          type="image/png"
        />
      </head>
      <body className={`font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <GlobalErrorBoundary>
            {children}
            <Toaster richColors position="top-right" />
          </GlobalErrorBoundary>
        </ThemeProvider>
      </body>
    </html>
  );
}
