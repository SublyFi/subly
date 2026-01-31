"use client";

import { FC } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Package, Wallet, Code, ArrowLeft } from "lucide-react";
import { useMerchant } from "@/hooks/useMerchant";

const merchantLinks = [
  { href: "/merchant", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/merchant/plans", label: "Plans", icon: Package, exact: false },
  { href: "/merchant/revenue", label: "Revenue", icon: Wallet, exact: false },
  { href: "/merchant/sdk-guide", label: "SDK Guide", icon: Code, exact: false },
];

export const MerchantSidebar: FC = () => {
  const pathname = usePathname();
  const { merchant } = useMerchant();

  const isActive = (href: string, exact: boolean) => {
    if (exact) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <aside className="w-64 min-h-screen bg-gray-900 border-r border-gray-800 hidden lg:block">
      {/* Brand / Merchant Info */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
            <span className="text-white font-bold text-lg">
              {merchant?.name?.charAt(0).toUpperCase() || "M"}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {merchant?.name || "Merchant"}
            </p>
            <p className="text-xs text-gray-400">Merchant Dashboard</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-4">
        <ul className="space-y-2">
          {merchantLinks.map((link) => {
            const Icon = link.icon;
            const active = isActive(link.href, link.exact);

            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? "bg-purple-600/20 text-purple-400"
                      : "text-gray-400 hover:bg-gray-800 hover:text-white"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Back to User Dashboard */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-800">
        <Link
          href="/"
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          User Dashboard
        </Link>
      </div>
    </aside>
  );
};
