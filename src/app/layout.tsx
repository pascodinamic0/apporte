import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "@/src/components/Header";
import { BottomNav } from "@/src/components/BottomNav";
import { RoleBottomNav } from "@/src/components/RoleBottomNav";
import { Providers } from "@/src/components/Providers";
import { CartBar } from "@/src/components/CartBar";
import { getCurrentUser } from "@/src/lib/auth";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Apporte — On te l’apporte",
  description:
    "Commande de nourriture et trouvailles utiles à Kinshasa. On te l’apporte.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Apporte",
    statusBarStyle: "black-translucent",
  },
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
        <Header />
        <main className="flex-1 mx-auto w-full max-w-5xl px-4 pt-4 pb-[max(96px,calc(72px+env(safe-area-inset-bottom)))]">
          {children}
        </main>
        {isCustomer && <CartBar />}
        {isCustomer && <BottomNav />}
        {!isCustomer && <RoleBottomNav />}
        <Providers />
      </body>
    </html>
  );
}
