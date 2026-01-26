"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { useMembership } from "@/providers/MembershipProvider";
import Link from "next/link";

export default function CreatePlanPage() {
  const router = useRouter();
  const { connected } = useWallet();
  const { client, isReady } = useMembership();
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    priceUsdc: "",
    billingCycleDays: "30",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client) return;

    setCreating(true);
    try {
      const result = await client.createPlan({
        name: formData.name,
        description: formData.description,
        priceUsdc: parseFloat(formData.priceUsdc),
        billingCycleDays: parseInt(formData.billingCycleDays),
      });

      if (result.success) {
        router.push("/");
      } else {
        alert(`Failed to create plan: ${result.error}`);
      }
    } catch (error) {
      console.error("Create plan error:", error);
      alert("Failed to create plan");
    } finally {
      setCreating(false);
    }
  };

  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <p className="text-gray-600">Please connect your wallet to create a plan.</p>
      </div>
    );
  }

  if (!isReady) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-12">
      <div className="mb-6">
        <Link href="/" className="text-sm text-blue-600 hover:text-blue-800">
          &larr; Back to Dashboard
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">Create New Plan</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Plan Name
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g., Basic Plan"
            maxLength={32}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Describe what this plan offers..."
            rows={3}
            maxLength={64}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Price (USDC)
            </label>
            <input
              type="number"
              value={formData.priceUsdc}
              onChange={(e) => setFormData({ ...formData, priceUsdc: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="9.99"
              min="0.01"
              step="0.01"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Billing Cycle (days)
            </label>
            <select
              value={formData.billingCycleDays}
              onChange={(e) => setFormData({ ...formData, billingCycleDays: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="7">Weekly (7 days)</option>
              <option value="30">Monthly (30 days)</option>
              <option value="90">Quarterly (90 days)</option>
              <option value="365">Yearly (365 days)</option>
            </select>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Summary</h3>
          <p className="text-sm text-gray-600">
            {formData.name || "Plan Name"} - ${formData.priceUsdc || "0.00"} per{" "}
            {formData.billingCycleDays} days
          </p>
        </div>

        <button
          type="submit"
          disabled={creating || !formData.name || !formData.priceUsdc}
          className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {creating ? "Creating..." : "Create Plan"}
        </button>
      </form>
    </div>
  );
}
