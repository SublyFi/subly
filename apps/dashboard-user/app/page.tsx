"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import Link from "next/link";
import { useSubscriptions } from "@/hooks/useSubscriptions";
import { SubscriptionCard } from "@/components/subscriptions";

export default function HomePage() {
  const { connected, publicKey } = useWallet();
  const { subscriptions, loading, error, refresh } = useSubscriptions();

  const activeSubscriptions = subscriptions.filter((s) => s.isActive);
  const cancelledSubscriptions = subscriptions.filter((s) => !s.isActive);

  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Welcome to Subly
        </h1>
        <p className="text-gray-600 mb-8 max-w-md">
          Connect your wallet to manage your subscriptions with privacy-first protection.
        </p>
        <div className="text-sm text-gray-500">
          Click &quot;Select Wallet&quot; in the header to get started
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Subscriptions</h1>
          <p className="text-sm text-gray-500 mt-1">
            Wallet: {publicKey?.toBase58().slice(0, 8)}...{publicKey?.toBase58().slice(-8)}
          </p>
        </div>
        <Link
          href="/browse"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 text-sm"
        >
          Browse Plans
        </Link>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white rounded-lg shadow-md p-6 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3 mb-4"></div>
              <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            </div>
          ))}
        </div>
      ) : activeSubscriptions.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center mb-8">
          <p className="text-gray-500 mb-4">
            You don&apos;t have any active subscriptions yet.
          </p>
          <Link
            href="/browse"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
          >
            Browse Available Plans
          </Link>
        </div>
      ) : (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Active Subscriptions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeSubscriptions.map((subscription) => (
              <SubscriptionCard
                key={subscription.publicKey.toBase58()}
                subscription={subscription}
                onCancelled={refresh}
              />
            ))}
          </div>
        </div>
      )}

      {cancelledSubscriptions.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-500 mb-4">Cancelled Subscriptions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 opacity-60">
            {cancelledSubscriptions.map((subscription) => (
              <SubscriptionCard
                key={subscription.publicKey.toBase58()}
                subscription={subscription}
                onCancelled={refresh}
              />
            ))}
          </div>
        </div>
      )}

      <div className="bg-gray-100 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          How Subly Works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg p-4">
            <div className="text-2xl mb-2">1</div>
            <h3 className="font-medium text-gray-900 mb-1">Browse Plans</h3>
            <p className="text-sm text-gray-600">
              Find subscription plans from various businesses.
            </p>
          </div>
          <div className="bg-white rounded-lg p-4">
            <div className="text-2xl mb-2">2</div>
            <h3 className="font-medium text-gray-900 mb-1">Subscribe Privately</h3>
            <p className="text-sm text-gray-600">
              Your subscription data is encrypted and private.
            </p>
          </div>
          <div className="bg-white rounded-lg p-4">
            <div className="text-2xl mb-2">3</div>
            <h3 className="font-medium text-gray-900 mb-1">Manage Easily</h3>
            <p className="text-sm text-gray-600">
              View and cancel subscriptions anytime.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
