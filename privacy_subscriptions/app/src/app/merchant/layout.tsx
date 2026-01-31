"use client";

import { FC, ReactNode } from "react";
import Link from "next/link";
import { Shield } from "lucide-react";
import { MerchantSidebar } from "@/components/layout/MerchantSidebar";
import { WalletButton } from "@/components/common/WalletButton";

interface MerchantLayoutProps {
  children: ReactNode;
}

const MerchantLayout: FC<MerchantLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-900 flex">
      {/* Sidebar */}
      <MerchantSidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Header */}
        <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-10">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              {/* Logo - visible on mobile */}
              <Link href="/merchant" className="flex items-center gap-2 lg:hidden">
                <Shield className="w-8 h-8 text-purple-500" />
                <span className="text-xl font-bold text-white">
                  Subly
                </span>
                <span className="text-xs text-gray-400 ml-1">Merchant</span>
              </Link>

              {/* Empty space for desktop (logo in sidebar) */}
              <div className="hidden lg:block" />

              {/* Wallet Button */}
              <WalletButton />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default MerchantLayout;
