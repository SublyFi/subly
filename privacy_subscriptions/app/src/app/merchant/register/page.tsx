"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { useMerchant } from "@/hooks/useMerchant";
import { MerchantRegistrationForm } from "@/components/merchant/MerchantRegistrationForm";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { WalletButton } from "@/components/common/WalletButton";

export default function MerchantRegisterPage() {
  const router = useRouter();
  const wallet = useWallet();
  const { isRegistered, isLoading } = useMerchant();

  // Redirect to merchant dashboard if already registered
  useEffect(() => {
    if (!isLoading && isRegistered) {
      router.push("/merchant");
    }
  }, [isLoading, isRegistered, router]);

  // Show loading while checking registration status
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Show connect wallet message if not connected
  if (!wallet.connected) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="max-w-md w-full bg-gray-800 rounded-xl p-8 text-center">
          <h1 className="text-2xl font-bold text-white mb-4">
            Connect Your Wallet
          </h1>
          <p className="text-gray-400 mb-6">
            Please connect your wallet to register as a merchant.
          </p>
          <WalletButton />
        </div>
      </div>
    );
  }

  // Show registration form
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Become a Merchant
          </h1>
          <p className="text-gray-400">
            Register your business to start accepting subscription payments
          </p>
        </div>

        <div className="bg-gray-800 rounded-xl p-8">
          <MerchantRegistrationForm
            onSuccess={() => router.push("/merchant")}
          />
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            By registering, you agree to our terms of service
          </p>
        </div>
      </div>
    </div>
  );
}
