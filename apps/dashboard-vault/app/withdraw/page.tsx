"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useVault } from "@/hooks/useVault";
import { useBalance } from "@/hooks/useBalance";
import { WithdrawForm } from "@/components/withdraw/WithdrawForm";
import Link from "next/link";

export default function WithdrawPage() {
  const { connected } = useWallet();
  const { isInitialized, setShowInitModal } = useVault();
  const { valueUsdc, privateBalance } = useBalance();

  // Not connected state
  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Connect Your Wallet
          </h1>
          <p className="text-gray-600 mb-8">
            Connect your wallet to withdraw USDC from the vault.
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
            Initialize the vault with your Privacy Cash key to enable withdrawals.
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
          href="/"
          className="text-sm text-blue-600 hover:text-blue-700 mb-2 inline-block"
        >
          &larr; Back to Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Withdraw USDC</h1>
      </div>

      {/* Current Balance Info */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Vault Balance</p>
            <p className="text-lg font-semibold text-gray-900">
              {(Number(valueUsdc) / 1e6).toFixed(2)} USDC
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Privacy Cash Balance</p>
            <p className="text-lg font-semibold text-gray-900">
              {privateBalance.toFixed(2)} USDC
            </p>
          </div>
        </div>
      </div>

      {/* Withdraw Form */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <WithdrawForm />
      </div>

      {/* Info Section */}
      <div className="mt-6 text-sm text-gray-500">
        <h3 className="font-medium text-gray-700 mb-2">How it works:</h3>
        <ol className="list-decimal list-inside space-y-1">
          <li>USDC is redeemed from Kamino lending</li>
          <li>Funds are withdrawn through Privacy Cash for privacy</li>
          <li>You receive USDC at the specified address</li>
          <li>A small protocol fee (0.35%) is deducted</li>
        </ol>
      </div>
    </div>
  );
}
