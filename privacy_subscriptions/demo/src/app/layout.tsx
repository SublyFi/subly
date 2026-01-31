import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from './providers';
import { Toaster } from 'sonner';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Subly Demo - Privacy Subscriptions',
  description: 'Demo merchant app for Subly privacy-preserving subscriptions on Solana',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          {children}
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: 'rgb(31, 41, 55)',
                color: 'white',
                border: '1px solid rgb(55, 65, 81)',
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
