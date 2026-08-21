import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Outfit } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { ThemeProvider } from "@/lib/theme-context";
import { InstallGate } from "@/components/install/install-gate";
import { PinLock } from "@/components/install/pin-lock";
import { ForcePinChange } from "@/components/auth/force-pin-change";
import { ServiceWorkerRegister } from "@/components/install/sw-register";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MBalit — Smart Waste. Clean Future.",
  description: "Request waste pickup in The Gambia. Fast, simple, and eco-friendly.",
  keywords: [
    "garbage collection",
    "waste management",
    "Gambia",
    "eco-friendly",
    "pickup service",
    "MBalit",
  ],
  manifest: "/manifest.webmanifest",
  applicationName: "MBalit",
  appleWebApp: {
    capable: true,
    title: "MBalit",
    statusBarStyle: "default",
    startupImage: "/logo.png",
  },
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
    shortcut: "/logo.png",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0E7A3B",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="MBalit" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${outfit.variable} antialiased bg-white text-gray-900`}
        suppressHydrationWarning
      >
        <ThemeProvider>
          <AuthProvider>
            <InstallGate>
              <PinLock>
                <ForcePinChange>
                  {children}
                </ForcePinChange>
              </PinLock>
            </InstallGate>
          </AuthProvider>
        </ThemeProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
