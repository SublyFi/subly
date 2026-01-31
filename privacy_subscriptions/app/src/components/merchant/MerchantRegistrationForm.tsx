"use client";

import { useState } from "react";
import { useMerchant } from "@/hooks/useMerchant";
import { TransactionStatus } from "@/components/common/TransactionStatus";
import { TransactionState } from "@/types";

interface MerchantRegistrationFormProps {
  onSuccess: () => void;
}

const MAX_NAME_LENGTH = 64;
const MIN_NAME_LENGTH = 1;

export function MerchantRegistrationForm({
  onSuccess,
}: MerchantRegistrationFormProps) {
  const { register } = useMerchant();
  const [name, setName] = useState("");
  const [state, setState] = useState<TransactionState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);

  const isValidName = name.length >= MIN_NAME_LENGTH && name.length <= MAX_NAME_LENGTH;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValidName) {
      setError(`Name must be between ${MIN_NAME_LENGTH} and ${MAX_NAME_LENGTH} characters`);
      return;
    }

    setState("loading");
    setError(null);
    setSignature(null);

    try {
      const sig = await register(name);
      setSignature(sig);
      setState("success");
      onSuccess();
    } catch (err) {
      console.error("Registration error:", err);
      setError(err instanceof Error ? err.message : "Registration failed");
      setState("error");
    }
  };

  const handleReset = () => {
    setState("idle");
    setError(null);
    setSignature(null);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label
          htmlFor="merchantName"
          className="block text-sm font-medium text-gray-300 mb-2"
        >
          Business Name
        </label>
        <input
          type="text"
          id="merchantName"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your business name"
          maxLength={MAX_NAME_LENGTH}
          className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
          disabled={state === "loading"}
        />
        <p className="mt-2 text-sm text-gray-400">
          {name.length}/{MAX_NAME_LENGTH} characters
        </p>
      </div>

      {state === "idle" || state === "loading" ? (
        <button
          type="submit"
          disabled={!isValidName || state === "loading"}
          className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all duration-200 flex items-center justify-center"
        >
          {state === "loading" ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Registering...
            </>
          ) : (
            "Register as Merchant"
          )}
        </button>
      ) : (
        <TransactionStatus
          state={state}
          error={error}
          signature={signature}
          onReset={handleReset}
        />
      )}
    </form>
  );
}
