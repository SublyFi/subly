"use client";

import { FC } from "react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import Link from "next/link";
import { usePathname } from "next/navigation";

export const Header: FC = () => {
  const pathname = usePathname();

  const navItems = [
    { href: "/", label: "Dashboard" },
    { href: "/deposit", label: "Deposit" },
    { href: "/withdraw", label: "Withdraw" },
    { href: "/transfers", label: "Transfers" },
  ];

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-xl font-bold text-gray-900">
              Subly Vault
            </Link>
            <nav className="hidden md:flex gap-6">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`text-sm font-medium ${
                    pathname === item.href
                      ? "text-blue-600"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-500 bg-green-100 px-2 py-1 rounded">
              Mainnet
            </span>
            <WalletMultiButton />
          </div>
        </div>
      </div>
    </header>
  );
};
