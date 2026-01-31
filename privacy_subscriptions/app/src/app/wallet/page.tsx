"use client";

import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { Footer } from "@/components/layout/Footer";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { Wallet, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { BalanceCard } from "@/components/user/BalanceCard";
import { DepositForm } from "@/components/user/DepositForm";
import { WithdrawForm } from "@/components/user/WithdrawForm";
import { useBalance } from "@/hooks/useBalance";

type Tab = "deposit" | "withdraw";

export default function WalletPage() {
  const { connected } = useWallet();
  const { setVisible } = useWalletModal();
  const [activeTab, setActiveTab] = useState<Tab>("deposit");
  const balanceResult = useBalance();

  if (!connected) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Wallet className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Connect Your Wallet
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Please connect your wallet to manage your funds.
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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Wallet
            </h1>

            {/* Balance Card */}
            <div className="mb-6">
              <BalanceCard balanceResult={balanceResult} />
            </div>

            {/* Deposit/Withdraw Tabs */}
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm">
              <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="flex">
                  <button
                    onClick={() => setActiveTab("deposit")}
                    className={`flex-1 flex items-center justify-center gap-2 py-4 px-6 font-medium transition-colors ${
                      activeTab === "deposit"
                        ? "text-primary-600 border-b-2 border-primary-600"
                        : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                    }`}
                  >
                    <ArrowDownToLine className="w-5 h-5" />
                    Deposit
                  </button>
                  <button
                    onClick={() => setActiveTab("withdraw")}
                    className={`flex-1 flex items-center justify-center gap-2 py-4 px-6 font-medium transition-colors ${
                      activeTab === "withdraw"
                        ? "text-primary-600 border-b-2 border-primary-600"
                        : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                    }`}
                  >
                    <ArrowUpFromLine className="w-5 h-5" />
                    Withdraw
                  </button>
                </nav>
              </div>

              <div className="p-6">
                {activeTab === "deposit" ? (
                  <DepositForm onSuccess={balanceResult.refresh} />
                ) : (
                  <WithdrawForm
                    maxBalance={balanceResult.balance.decryptedLamports}
                    onSuccess={balanceResult.refresh}
                  />
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
      <Footer />
    </div>
  );
}
