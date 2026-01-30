"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useVault } from "@/hooks/useVault";
import { TransferForm } from "@/components/transfers/TransferForm";
import Link from "next/link";

export default function NewTransferPage() {
  const { connected } = useWallet();
  const { isInitialized, setShowInitModal } = useVault();

  // Not connected state
  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Connect Your Wallet
          </h1>
          <p className="text-gray-600 mb-8">
            Connect your wallet to set up recurring transfers.
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
            Initialize the vault with your Privacy Cash key to create transfers.
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

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/transfers"
          className="text-sm text-blue-600 hover:text-blue-700 mb-2 inline-block"
        >
          &larr; Back to Transfers
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">
          Set Up Recurring Payment
        </h1>
      </div>

      {/* Transfer Form */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <TransferForm />
      </div>

      {/* Info Section */}
      <div className="mt-6 text-sm text-gray-500">
        <h3 className="font-medium text-gray-700 mb-2">How it works:</h3>
        <ol className="list-decimal list-inside space-y-1">
          <li>Enter the recipient's Solana address</li>
          <li>Set the amount and frequency</li>
          <li>Transfers are executed privately via Privacy Cash</li>
          <li>You can manually execute or cancel transfers at any time</li>
        </ol>
      </div>
    </div>
  );
}
