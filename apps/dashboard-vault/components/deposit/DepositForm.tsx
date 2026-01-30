"use client";

import { FC, useState, useMemo } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import {
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  createTransferInstruction,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  getAccount,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { useVault } from "@/hooks/useVault";
import { useBalance } from "@/hooks/useBalance";

// USDC mint address on Solana mainnet
const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");

interface DepositFormProps {
  onSuccess?: (tx: string) => void;
}

type DepositStep = "fund" | "deposit";

export const DepositForm: FC<DepositFormProps> = ({ onSuccess }) => {
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const { client, isInitialized, derivedPublicKey } = useVault();
  const {
    walletUsdcBalance,
    derivedAddressBalance,
    refresh: refreshBalance,
  } = useBalance();

  const [amount, setAmount] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txSignature, setTxSignature] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<DepositStep>("fund");

  const presetPercentages = [25, 50, 75, 100];

  // Determine which step we're on based on balances
  const effectiveStep = useMemo(() => {
    if (derivedAddressBalance > 0) {
      return "deposit";
    }
    return "fund";
  }, [derivedAddressBalance]);

  const handlePreset = (percentage: number) => {
    const sourceBalance =
      effectiveStep === "fund" ? walletUsdcBalance : derivedAddressBalance;
    const presetAmount = (sourceBalance * percentage) / 100;
    setAmount(presetAmount.toFixed(2));
  };

  // Step 1: Transfer USDC from wallet to derived address
  const handleFundDerivedAddress = async () => {
    if (!publicKey || !derivedPublicKey || !sendTransaction) {
      setError("Wallet not connected or Privacy Cash not initialized");
      return;
    }

    const fundAmount = parseFloat(amount);
    if (isNaN(fundAmount) || fundAmount <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    if (fundAmount > walletUsdcBalance) {
      setError("Amount exceeds your wallet USDC balance");
      return;
    }

    setIsProcessing(true);
    setError(null);
    setTxSignature(null);

    try {
      const derivedPubkey = new PublicKey(derivedPublicKey);

      // Get source token account (user's wallet)
      const sourceAta = await getAssociatedTokenAddress(
        USDC_MINT,
        publicKey,
        false,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      // Get destination token account (derived address)
      const destAta = await getAssociatedTokenAddress(
        USDC_MINT,
        derivedPubkey,
        true, // allowOwnerOffCurve - derived address may not be on curve
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      const transaction = new Transaction();

      // Check if destination ATA exists, if not create it
      try {
        await getAccount(connection, destAta);
      } catch {
        // ATA doesn't exist, need to create it
        // First, we need to fund the derived address with some SOL for rent
        const rentExemptBalance =
          await connection.getMinimumBalanceForRentExemption(165); // Token account size

        // Transfer SOL for rent (if needed)
        const derivedAccountInfo = await connection.getAccountInfo(
          derivedPubkey
        );
        if (
          !derivedAccountInfo ||
          derivedAccountInfo.lamports < rentExemptBalance
        ) {
          transaction.add(
            SystemProgram.transfer({
              fromPubkey: publicKey,
              toPubkey: derivedPubkey,
              lamports: Math.max(
                rentExemptBalance - (derivedAccountInfo?.lamports ?? 0),
                0.002 * LAMPORTS_PER_SOL
              ),
            })
          );
        }

        // Create ATA for derived address
        transaction.add(
          createAssociatedTokenAccountInstruction(
            publicKey, // payer
            destAta, // ata
            derivedPubkey, // owner
            USDC_MINT // mint
          )
        );
      }

      // Transfer USDC
      const baseUnits = Math.floor(fundAmount * 1_000_000); // USDC has 6 decimals
      transaction.add(
        createTransferInstruction(sourceAta, destAta, publicKey, baseUnits)
      );

      // Get recent blockhash
      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      // Send transaction
      const signature = await sendTransaction(transaction, connection);

      // Wait for confirmation
      await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
      });

      setTxSignature(signature);
      setAmount("");

      // Refresh balance to show updated derived address balance
      await refreshBalance();

      // Move to deposit step
      setCurrentStep("deposit");
    } catch (err) {
      console.error("Fund transfer failed:", err);
      setError(err instanceof Error ? err.message : "Transfer failed");
    } finally {
      setIsProcessing(false);
    }
  };

  // Step 2: Deposit from derived address to Privacy Cash
  const handleDeposit = async () => {
    if (!client || !isInitialized) {
      setError("Privacy Cash not initialized");
      return;
    }

    const depositAmount = parseFloat(amount);
    if (isNaN(depositAmount) || depositAmount <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    if (depositAmount > derivedAddressBalance) {
      setError("Amount exceeds your Privacy Cash funding balance");
      return;
    }

    setIsProcessing(true);
    setError(null);
    setTxSignature(null);

    try {
      // Deposit via Privacy Cash SDK (through backend)
      const result = await client.depositPrivate(depositAmount);

      setTxSignature(result.tx);
      setAmount("");

      // Refresh balance
      await refreshBalance();

      if (onSuccess) {
        onSuccess(result.tx);
      }
    } catch (err) {
      console.error("Deposit failed:", err);
      setError(err instanceof Error ? err.message : "Deposit failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (effectiveStep === "fund") {
      await handleFundDerivedAddress();
    } else {
      await handleDeposit();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Step Indicator */}
      <div className="flex items-center justify-center gap-4 mb-6">
        <div
          className={`flex items-center gap-2 ${effectiveStep === "fund" ? "text-blue-600 font-medium" : "text-gray-400"}`}
        >
          <span
            className={`w-6 h-6 rounded-full flex items-center justify-center text-sm ${effectiveStep === "fund" ? "bg-blue-600 text-white" : "bg-gray-200"}`}
          >
            1
          </span>
          <span>Fund</span>
        </div>
        <div className="w-8 h-0.5 bg-gray-200" />
        <div
          className={`flex items-center gap-2 ${effectiveStep === "deposit" ? "text-blue-600 font-medium" : "text-gray-400"}`}
        >
          <span
            className={`w-6 h-6 rounded-full flex items-center justify-center text-sm ${effectiveStep === "deposit" ? "bg-blue-600 text-white" : "bg-gray-200"}`}
          >
            2
          </span>
          <span>Deposit</span>
        </div>
      </div>

      {/* Balance Info */}
      <div className="bg-gray-50 rounded-md p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Wallet USDC Balance:</span>
          <span className="font-medium">{walletUsdcBalance.toFixed(2)} USDC</span>
        </div>
        {derivedPublicKey && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Privacy Cash Funding Balance:</span>
            <span className="font-medium">
              {derivedAddressBalance.toFixed(2)} USDC
            </span>
          </div>
        )}
      </div>

      {/* Derived Address Display */}
      {derivedPublicKey && effectiveStep === "fund" && (
        <div className="bg-yellow-50 border border-yellow-100 rounded-md p-4">
          <p className="text-sm text-yellow-800 mb-2">
            <strong>Step 1:</strong> Transfer USDC from your wallet to your
            Privacy Cash funding address.
          </p>
          <div className="bg-yellow-100 rounded p-2">
            <p className="text-xs text-yellow-700 mb-1">Funding Address:</p>
            <p className="text-xs font-mono text-yellow-900 break-all">
              {derivedPublicKey}
            </p>
          </div>
        </div>
      )}

      {effectiveStep === "deposit" && (
        <div className="bg-green-50 border border-green-100 rounded-md p-4">
          <p className="text-sm text-green-800">
            <strong>Step 2:</strong> Your funding address has{" "}
            {derivedAddressBalance.toFixed(2)} USDC. You can now deposit to
            Privacy Cash.
          </p>
        </div>
      )}

      {/* Amount Input */}
      <div>
        <label
          htmlFor="amount"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Amount (USDC)
        </label>
        <input
          id="amount"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          min="0"
          step="0.01"
          className="w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
          disabled={isProcessing}
        />
        <p className="text-xs text-gray-500 mt-1">
          Available:{" "}
          {(effectiveStep === "fund"
            ? walletUsdcBalance
            : derivedAddressBalance
          ).toFixed(2)}{" "}
          USDC
        </p>
      </div>

      {/* Preset Buttons */}
      <div className="flex gap-2">
        {presetPercentages.map((pct) => (
          <button
            key={pct}
            type="button"
            onClick={() => handlePreset(pct)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={
              isProcessing ||
              (effectiveStep === "fund"
                ? walletUsdcBalance <= 0
                : derivedAddressBalance <= 0)
            }
          >
            {pct === 100 ? "Max" : `${pct}%`}
          </button>
        ))}
      </div>

      {/* Privacy Notice */}
      <div className="bg-blue-50 border border-blue-100 rounded-md p-4">
        <p className="text-sm text-blue-800">
          <strong>Privacy Notice:</strong> Your deposit will be processed
          through Privacy Cash. The transaction will be private and untraceable.
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Success Display */}
      {txSignature && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-md">
          <p className="text-sm text-green-800 font-medium">
            {effectiveStep === "fund"
              ? "Transfer successful! You can now deposit."
              : "Deposit successful!"}
          </p>
          <p className="text-xs text-green-600 mt-1 break-all">
            Transaction: {txSignature}
          </p>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        className="w-full px-4 py-3 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={isProcessing || !amount || parseFloat(amount) <= 0}
      >
        {isProcessing
          ? "Processing..."
          : effectiveStep === "fund"
            ? "Transfer USDC to Funding Address"
            : "Deposit to Privacy Cash"}
      </button>
    </form>
  );
};
