import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "@/src/components/Header";
import { BottomNav } from "@/src/components/BottomNav";
import { Providers } from "@/src/components/Providers";
import { CartBar } from "@/src/components/CartBar";

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
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${geistSans.variable} ${geistMono.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-white text-gray-900">
        <Header />
        <main className="flex-1 mx-auto w-full max-w-5xl px-4 pb-24 pt-4">{children}</main>
        <CartBar />
        <BottomNav />
        <Providers />
      </body>
    </html>
  );
}
