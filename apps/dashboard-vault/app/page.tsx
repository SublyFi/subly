"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useVault } from "@/hooks/useVault";
import { useTransfers } from "@/hooks/useTransfers";
import { BalanceCard } from "@/components/balance/BalanceCard";
import { YieldCard } from "@/components/balance/YieldCard";
import Link from "next/link";
import { truncateAddress, INTERVAL_LABELS } from "@/lib/constants";

export default function DashboardPage() {
  const { connected } = useWallet();
  const { isInitialized, setShowInitModal } = useVault();
  const { transfers, loading: transfersLoading } = useTransfers();

  // Not connected state
  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Welcome to Subly Vault
          </h1>
          <p className="text-gray-600 mb-8">
            Connect your wallet to access your private USDC vault with automated
            yield generation.
          </p>
          <WalletMultiButton />
        </div>
      </div>
    );
  }

  // Connected but not initialized state
  if (!isInitialized) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Initialize Your Vault
          </h1>
          <p className="text-gray-600 mb-8">
            Enter your Privacy Cash private key to enable private deposits and
            withdrawals.
          </p>
          <button
            onClick={() => setShowInitModal(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Initialize Vault
          </button>
        </div>
      </div>
    );
  }

  // Get interval label helper
  const getIntervalLabel = (seconds: number): string => {
    if (seconds === 3600) return "Hourly";
    if (seconds === 86400) return "Daily";
    if (seconds === 604800) return "Weekly";
    if (seconds === 2592000) return "Monthly";
    return `${seconds}s`;
  };

  // Dashboard view
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Dashboard</h1>

      {/* Balance and Yield Cards */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <BalanceCard />
        <YieldCard />
      </div>

      {/* Active Transfers Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Active Transfers ({transfers.length})
          </h2>
          <Link
            href="/transfers/new"
            className="text-sm px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700"
          >
            + New Transfer
          </Link>
        </div>

        {transfersLoading ? (
          <div className="text-gray-500 text-sm py-4">Loading transfers...</div>
        ) : transfers.length === 0 ? (
          <div className="text-gray-500 text-sm py-4">
            No active recurring transfers.{" "}
            <Link href="/transfers/new" className="text-blue-600 hover:underline">
              Set up your first one
            </Link>
            .
          </div>
        ) : (
          <div className="space-y-3">
            {transfers.slice(0, 5).map((transfer) => (
              <div
                key={transfer.transferId}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div>
                  <p className="font-medium text-gray-900">
                    To: {truncateAddress(transfer.recipient)}
                  </p>
                  <p className="text-sm text-gray-500">
                    {transfer.amount} USDC / {getIntervalLabel(transfer.intervalSeconds)}
                    {transfer.memo && ` - ${transfer.memo}`}
                  </p>
                </div>
                <Link
                  href={`/transfers?id=${transfer.transferId}`}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  View
                </Link>
              </div>
            ))}
            {transfers.length > 5 && (
              <Link
                href="/transfers"
                className="block text-center text-sm text-blue-600 hover:text-blue-700 py-2"
              >
                View all {transfers.length} transfers
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
