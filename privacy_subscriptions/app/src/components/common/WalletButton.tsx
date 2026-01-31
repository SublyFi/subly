"use client";

import { FC, useState, useRef, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { Wallet, Copy, LogOut, ChevronDown, Check } from "lucide-react";

export const WalletButton: FC = () => {
  const { publicKey, disconnect, connected, connecting } = useWallet();
  const { setVisible } = useWalletModal();
  const [showDropdown, setShowDropdown] = useState(false);
  const [copied, setCopied] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const shortenAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const copyAddress = async () => {
    if (publicKey) {
      await navigator.clipboard.writeText(publicKey.toBase58());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDisconnect = async () => {
    await disconnect();
    setShowDropdown(false);
  };

  if (!connected) {
    return (
      <button
        onClick={() => setVisible(true)}
        disabled={connecting}
        className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
      >
        <Wallet className="w-4 h-4" />
        {connecting ? "Connecting..." : "Connect Wallet"}
      </button>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-medium py-2 px-4 rounded-lg transition-colors"
      >
        <Wallet className="w-4 h-4 text-primary-600" />
        <span className="font-mono">
          {publicKey ? shortenAddress(publicKey.toBase58()) : ""}
        </span>
        <ChevronDown
          className={`w-4 h-4 transition-transform ${showDropdown ? "rotate-180" : ""}`}
        />
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
          <button
            onClick={copyAddress}
            className="flex items-center gap-2 w-full px-4 py-2 text-left text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            {copied ? (
              <Check className="w-4 h-4 text-success-500" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
            {copied ? "Copied!" : "Copy Address"}
          </button>
          <hr className="my-1 border-gray-200 dark:border-gray-700" />
          <button
            onClick={handleDisconnect}
            className="flex items-center gap-2 w-full px-4 py-2 text-left text-error-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
};
