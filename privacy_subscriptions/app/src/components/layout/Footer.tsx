"use client";

import { FC } from "react";
import { Shield } from "lucide-react";

export const Footer: FC = () => {
  return (
    <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary-600" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Subly - Privacy-Preserving Subscriptions
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-500">
            <span>Powered by Solana + Arcium MPC</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
