import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/components/auth-provider";
import { LanguageProvider } from "@/lib/i18n";
import { Analytics } from "@vercel/analytics/next";
import { GoogleAnalytics } from "@/components/google-analytics";
import { CookieConsent } from "@/components/cookie-consent";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://soundril.com"),
  title: "Soundril - AI Audio Tools",
  description:
    "Extract vocals, generate synchronized lyrics with AI-powered audio tools.",
  keywords: [
    "vocal remover",
    "instrumental track",
    "AI audio",
    "MR extraction",
    "LRC generator",
    "synchronized lyrics",
    "karaoke",
    "source separation",
  ],
  openGraph: {
    title: "Soundril - AI Audio Tools",
    description:
      "Extract vocals, generate synchronized lyrics with AI-powered audio tools.",
    siteName: "Soundril",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Soundril - AI Audio Tools",
    description:
      "Extract vocals, generate synchronized lyrics with AI-powered audio tools.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <GoogleAnalytics />
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <AuthProvider>
            <LanguageProvider>
              {children}
            </LanguageProvider>
            <Toaster theme="dark" />
            <CookieConsent />
            <Analytics />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
