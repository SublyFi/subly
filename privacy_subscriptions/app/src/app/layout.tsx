import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { WalletConnectionProvider } from "@/components/providers/WalletConnectionProvider";
import { ArciumProvider } from "@/components/providers/ArciumProvider";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Subly - Privacy-Preserving Subscriptions",
  description:
    "Manage your privacy-preserving subscriptions on Solana with Arcium MPC",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <WalletConnectionProvider>
          <ArciumProvider>{children}</ArciumProvider>
        </WalletConnectionProvider>
      </body>
    </html>
  );
}
