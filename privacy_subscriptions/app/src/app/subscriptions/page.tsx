"use client";

import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { Footer } from "@/components/layout/Footer";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { CreditCard, RefreshCw } from "lucide-react";
import { SubscriptionList } from "@/components/user/SubscriptionList";
import { useSubscriptions } from "@/hooks/useSubscriptions";

export default function SubscriptionsPage() {
  const { connected } = useWallet();
  const { setVisible } = useWalletModal();
  const { subscriptions, isLoading, error, refresh } = useSubscriptions();

  if (!connected) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <CreditCard className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Connect Your Wallet
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Please connect your wallet to view your subscriptions.
            </p>
            <button
              onClick={() => setVisible(true)}
              className="bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
            >
              Connect Wallet
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 flex">
        <Sidebar />
        <main className="flex-1 p-6 bg-gray-50 dark:bg-gray-800">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                My Subscriptions
              </h1>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Encrypted & Private
                </span>
                <button
                  onClick={refresh}
                  disabled={isLoading}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-white dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                  aria-label="Refresh subscriptions"
                >
                  <RefreshCw
                    className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
                  />
                </button>
              </div>
            </div>

            <SubscriptionList
              subscriptions={subscriptions}
              isLoading={isLoading}
              error={error}
              onRefresh={refresh}
            />
          </div>
        </main>
      </div>
      <Footer />
    </div>
  );
}
