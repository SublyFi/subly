"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useMembership } from "@/providers/MembershipProvider";
import type { Business, Plan } from "@subly/membership-sdk";
import Link from "next/link";
import { PlanCard } from "@/components/plans/PlanCard";

export default function DashboardPage() {
  const { connected, publicKey } = useWallet();
  const { client, isReady } = useMembership();
  const [business, setBusiness] = useState<Business | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [formData, setFormData] = useState({ name: "", metadataUri: "" });

  useEffect(() => {
    if (isReady && client) {
      loadBusinessData();
    }
  }, [isReady, client]);

  const loadBusinessData = async () => {
    if (!client) return;
    setLoading(true);
    try {
      const businessData = await client.getBusiness();
      setBusiness(businessData);
      if (businessData) {
        const plansData = await client.getPlans();
        setPlans(plansData);
      }
    } catch (error) {
      console.error("Failed to load business data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client) return;
    setRegistering(true);
    try {
      const result = await client.registerBusiness({
        name: formData.name,
        metadataUri: formData.metadataUri || "",
      });
      if (result.success) {
        await loadBusinessData();
      } else {
        alert(`Registration failed: ${result.error}`);
      }
    } catch (error) {
      console.error("Registration error:", error);
    } finally {
      setRegistering(false);
    }
  };

  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Welcome to Subly Business
        </h1>
        <p className="text-gray-600 mb-8 max-w-md">
          Connect your wallet to manage subscription plans for your business.
        </p>
        <div className="text-sm text-gray-500">
          Click &quot;Select Wallet&quot; in the header to get started
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          Register Your Business
        </h1>
        <form onSubmit={handleRegister} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Business Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your business name"
              maxLength={32}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Metadata URI (optional)
            </label>
            <input
              type="text"
              value={formData.metadataUri}
              onChange={(e) => setFormData({ ...formData, metadataUri: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://..."
              maxLength={128}
            />
          </div>
          <button
            type="submit"
            disabled={registering || !formData.name}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {registering ? "Registering..." : "Register Business"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{business.name}</h1>
        <p className="text-sm text-gray-500 mt-1">
          Wallet: {publicKey?.toBase58().slice(0, 8)}...{publicKey?.toBase58().slice(-8)}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-500 mb-1">Total Plans</div>
          <div className="text-3xl font-bold text-gray-900">{plans.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-500 mb-1">Active Plans</div>
          <div className="text-3xl font-bold text-green-600">
            {plans.filter((p) => p.isActive).length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-500 mb-1">Status</div>
          <div className="text-lg font-medium text-green-600">
            {business.isActive ? "Active" : "Inactive"}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Your Plans</h2>
        <Link
          href="/plans/new"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          Create Plan
        </Link>
      </div>

      {plans.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500 mb-4">No plans yet. Create your first subscription plan.</p>
          <Link
            href="/plans/new"
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            Create Plan
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <PlanCard key={plan.publicKey.toBase58()} plan={plan} />
          ))}
        </div>
      )}
    </div>
  );
}
