"use client";

import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Shield, Lock, Eye, Zap } from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import Link from "next/link";

const features = [
  {
    icon: Shield,
    title: "Privacy-Preserving",
    description:
      "Your subscription details are encrypted using Arcium MPC. No one can see what you subscribe to.",
  },
  {
    icon: Lock,
    title: "Secure Payments",
    description:
      "Funds are held in a secure vault. Automatic payments are processed without revealing your balance.",
  },
  {
    icon: Eye,
    title: "Only You Can See",
    description:
      "Your balance and subscription history are encrypted. Only your wallet can decrypt and view them.",
  },
  {
    icon: Zap,
    title: "Powered by Solana",
    description:
      "Fast, low-cost transactions on Solana. Subscribe and manage payments in seconds.",
  },
];

export default function Home() {
  const { connected } = useWallet();
  const { setVisible } = useWalletModal();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-gradient-to-b from-primary-50 to-white dark:from-gray-900 dark:to-gray-800 py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="flex justify-center mb-6">
              <Shield className="w-16 h-16 text-primary-600" />
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-6">
              Privacy-Preserving Subscriptions
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-8">
              Subscribe to services without revealing your identity or subscription
              details. Powered by Solana and Arcium MPC encryption.
            </p>
            {connected ? (
              <Link
                href="/wallet"
                className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 px-8 rounded-lg transition-colors text-lg"
              >
                Go to Dashboard
              </Link>
            ) : (
              <button
                onClick={() => setVisible(true)}
                className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 px-8 rounded-lg transition-colors text-lg"
              >
                Connect Wallet to Start
              </button>
            )}
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 bg-white dark:bg-gray-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
              Why Choose Subly?
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {features.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={feature.title}
                    className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 text-center"
                  >
                    <div className="flex justify-center mb-4">
                      <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
                        <Icon className="w-6 h-6 text-primary-600" />
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                      {feature.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-primary-600">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold text-white mb-6">
              Ready to Get Started?
            </h2>
            <p className="text-primary-100 text-lg mb-8 max-w-xl mx-auto">
              Connect your Solana wallet and start managing your subscriptions
              privately.
            </p>
            {connected ? (
              <Link
                href="/wallet"
                className="inline-flex items-center gap-2 bg-white text-primary-600 hover:bg-primary-50 font-medium py-3 px-8 rounded-lg transition-colors"
              >
                Go to Dashboard
              </Link>
            ) : (
              <button
                onClick={() => setVisible(true)}
                className="inline-flex items-center gap-2 bg-white text-primary-600 hover:bg-primary-50 font-medium py-3 px-8 rounded-lg transition-colors"
              >
                Connect Wallet
              </button>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
