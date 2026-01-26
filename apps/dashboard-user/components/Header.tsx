"use client";

import { FC } from "react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import Link from "next/link";

export const Header: FC = () => {
  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-xl font-bold text-gray-900">
              Subly
            </Link>
            <nav className="hidden md:flex gap-6">
              <Link
                href="/"
                className="text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                My Subscriptions
              </Link>
              <Link
                href="/browse"
                className="text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                Browse Plans
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-500 bg-yellow-100 px-2 py-1 rounded">
              Devnet
            </span>
            <WalletMultiButton />
          </div>
        </div>
      </div>
    </header>
  );
};
