'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletButton } from '@/components/WalletButton';
import { PlanSelection } from '@/components/PlanSelection';
import { SubscribedDashboard } from '@/components/SubscribedDashboard';
import { useSubly } from '@/contexts/SublyContext';

function LandingContent() {
  return (
    <div className="text-center max-w-2xl mx-auto">
      <div className="mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-primary-100 dark:bg-primary-900/30 rounded-full mb-6">
          <svg
            className="w-10 h-10 text-primary-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
        </div>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          Privacy-First Subscriptions
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
          Subscribe to premium services with on-chain privacy. Your subscription
          data is encrypted using Arcium MPC.
        </p>
        <WalletButton />
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
        <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
          <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mb-4 mx-auto">
            <svg
              className="w-6 h-6 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h3 className="font-bold text-gray-900 dark:text-white mb-2">
            Encrypted Payments
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Your payment amounts and balances are encrypted using Arcium MPC
          </p>
        </div>

        <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mb-4 mx-auto">
            <svg
              className="w-6 h-6 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h3 className="font-bold text-gray-900 dark:text-white mb-2">
            On-Chain Verification
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Subscription status is verifiable on-chain without revealing details
          </p>
        </div>

        <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
          <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mb-4 mx-auto">
            <svg
              className="w-6 h-6 text-purple-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <h3 className="font-bold text-gray-900 dark:text-white mb-2">
            Instant & Seamless
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Subscribe in seconds with your Solana wallet
          </p>
        </div>
      </div>
    </div>
  );
}

function MainContent() {
  const { subscriptionState, subscriptionLoading } = useSubly();

  if (subscriptionLoading === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full mb-4" />
        <p className="text-gray-500 dark:text-gray-400">
          Checking subscription status...
        </p>
      </div>
    );
  }

  if (subscriptionState.isSubscribed) {
    return <SubscribedDashboard />;
  }

  return <PlanSelection />;
}

export default function Home() {
  const { connected } = useWallet();

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">S</span>
              </div>
              <span className="font-bold text-xl text-gray-900 dark:text-white">
                Subly
              </span>
              <span className="text-xs bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 px-2 py-0.5 rounded-full">
                Demo
              </span>
            </div>
            <WalletButton />
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {connected ? <MainContent /> : <LandingContent />}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-sm text-gray-500 dark:text-gray-400">
            <p className="mb-2">
              Powered by{' '}
              <span className="font-medium text-gray-700 dark:text-gray-300">
                Arcium MPC
              </span>{' '}
              for privacy-preserving computations
            </p>
            <p>Built on Solana</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
