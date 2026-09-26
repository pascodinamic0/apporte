import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "@/src/components/Header";
import { BottomNav } from "@/src/components/BottomNav";
import { RoleBottomNav } from "@/src/components/RoleBottomNav";
import { Providers } from "@/src/components/Providers";
import { CartBar } from "@/src/components/CartBar";
import { getCurrentUser } from "@/src/lib/auth";
import { Splash } from "@/src/components/Splash";
import { PageTransition } from "@/src/components/PageTransition";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://apporte.vercel.app"),
  title: { default: "Apporte — On te l’apporte", template: "%s · Apporte" },
  openGraph: { siteName: "Apporte", locale: "fr_CD", type: "website" },
  description:
    "Commande de nourriture et trouvailles utiles à Kinshasa. On te l’apporte.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon-16x16.png", type: "image/png", sizes: "16x16" },
      { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon-180.png", sizes: "180x180" },
    ],
    shortcut: ["/favicon.ico"],
    other: [
      { rel: "apple-touch-startup-image", url: "/splash/apple-splash-1290x2796.png", media: "(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)" },
      { rel: "apple-touch-startup-image", url: "/splash/apple-splash-1170x2532.png", media: "(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)" },
      { rel: "apple-touch-startup-image", url: "/splash/apple-splash-750x1334.png", media: "(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)" },
      { rel: "apple-touch-startup-image", url: "/splash/apple-splash-1179x2556.png", media: "(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3)" },
      { rel: "apple-touch-startup-image", url: "/splash/apple-splash-1206x2622.png", media: "(device-width: 402px) and (device-height: 874px) and (-webkit-device-pixel-ratio: 3)" },
      { rel: "apple-touch-startup-image", url: "/splash/apple-splash-1320x2868.png", media: "(device-width: 440px) and (device-height: 956px) and (-webkit-device-pixel-ratio: 3)" },
    ],
  },
  appleWebApp: { capable: true, title: "Apporte", statusBarStyle: "default" },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#047857" },
    { media: "(prefers-color-scheme: dark)", color: "#065f46" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await getCurrentUser();
  const isCustomer = !user || user.role === "customer";
  return (
    <html lang="fr" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-dvh flex flex-col bg-white text-gray-900">
        <Splash />
        <Header />
        <main className="flex-1 mx-auto w-full max-w-5xl px-4 pt-4 pb-[max(132px,calc(104px+env(safe-area-inset-bottom)))]">
          <PageTransition>{children}</PageTransition>
        </main>
        {isCustomer && <CartBar />}
        {isCustomer && <BottomNav />}
        {!isCustomer && <RoleBottomNav role={(user?.role as any) ?? "merchant"} />}
        <Providers />
      </body>
    </html>
  );
}
