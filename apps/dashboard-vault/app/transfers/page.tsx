"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useVault } from "@/hooks/useVault";
import { useTransfers } from "@/hooks/useTransfers";
import { TransferCard } from "@/components/transfers/TransferCard";
import Link from "next/link";

export default function TransfersPage() {
  const { connected } = useWallet();
  const { isInitialized, setShowInitModal } = useVault();
  const { transfers, loading, error, executeTransfer, cancelTransfer, refresh } =
    useTransfers();

  // Not connected state
  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Connect Your Wallet
          </h1>
          <p className="text-gray-600 mb-8">
            Connect your wallet to manage recurring transfers.
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
            Initialize the vault with your Privacy Cash key to manage transfers.
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

  const handleExecute = async (transferId: string) => {
    await executeTransfer(transferId);
    await refresh();
  };

  const handleCancel = async (transferId: string) => {
    await cancelTransfer(transferId);
    await refresh();
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link
            href="/"
            className="text-sm text-blue-600 hover:text-blue-700 mb-2 inline-block"
          >
            &larr; Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Recurring Transfers</h1>
        </div>
        <Link
          href="/transfers/new"
          className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
        >
          + New Transfer
        </Link>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Loading transfers...</p>
        </div>
      ) : transfers.length === 0 ? (
        /* Empty State */
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-500 mb-4">No recurring transfers set up yet.</p>
          <Link
            href="/transfers/new"
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Create your first recurring transfer
          </Link>
        </div>
      ) : (
        /* Transfer List */
        <div className="space-y-4">
          {transfers.map((transfer) => (
            <TransferCard
              key={transfer.transferId}
              transfer={transfer}
              onExecute={handleExecute}
              onCancel={handleCancel}
            />
          ))}
        </div>
      )}

      {/* Info Section */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-medium text-gray-700 mb-2">
          About Recurring Transfers
        </h3>
        <ul className="text-sm text-gray-500 space-y-1 list-disc list-inside">
          <li>All transfers are executed privately through Privacy Cash</li>
          <li>Recipient addresses are stored locally, never on-chain</li>
          <li>You can manually execute transfers at any time</li>
          <li>Cancelling a transfer removes it from your local storage</li>
        </ul>
      </div>
    </div>
  );
}
