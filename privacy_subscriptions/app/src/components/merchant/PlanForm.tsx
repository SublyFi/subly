"use client";

import { useState, useEffect } from "react";
import { SubscriptionPlan, CreatePlanData } from "@/types";
import { usdcToUnits, unitsToUsdc } from "@/lib/format";

interface PlanFormProps {
  mode: "create" | "edit";
  initialData?: Partial<SubscriptionPlan>;
  onSubmit: (data: CreatePlanData) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const MAX_PLAN_NAME_LENGTH = 32;
const MIN_BILLING_CYCLE_DAYS = 1;
const MAX_BILLING_CYCLE_DAYS = 365;

const BILLING_CYCLE_PRESETS = [
  { label: "Weekly (7 days)", value: 7 },
  { label: "Bi-weekly (14 days)", value: 14 },
  { label: "Monthly (30 days)", value: 30 },
  { label: "Yearly (365 days)", value: 365 },
  { label: "Custom", value: 0 },
];

export function PlanForm({
  mode,
  initialData,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: PlanFormProps) {
  const [name, setName] = useState(initialData?.name ?? "");
  const [priceUSDC, setPriceUSDC] = useState(
    initialData?.price ? unitsToUsdc(initialData.price).toString() : ""
  );
  const [billingCycleDays, setBillingCycleDays] = useState(
    initialData?.billingCycleDays?.toString() ?? "30"
  );
  const [billingCyclePreset, setBillingCyclePreset] = useState(() => {
    const days = initialData?.billingCycleDays ?? 30;
    const preset = BILLING_CYCLE_PRESETS.find((p) => p.value === days);
    return preset ? days : 0; // 0 = custom
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (billingCyclePreset !== 0) {
      setBillingCycleDays(billingCyclePreset.toString());
    }
  }, [billingCyclePreset]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Name validation
    if (!name.trim()) {
      newErrors.name = "Plan name is required";
    } else if (name.length > MAX_PLAN_NAME_LENGTH) {
      newErrors.name = `Name must be ${MAX_PLAN_NAME_LENGTH} characters or less`;
    }

    // Price validation
    const priceValue = parseFloat(priceUSDC);
    if (!priceUSDC || isNaN(priceValue)) {
      newErrors.price = "Price is required";
    } else if (priceValue <= 0) {
      newErrors.price = "Price must be greater than 0";
    }

    // Billing cycle validation
    const daysValue = parseInt(billingCycleDays, 10);
    if (!billingCycleDays || isNaN(daysValue)) {
      newErrors.billingCycleDays = "Billing cycle is required";
    } else if (daysValue < MIN_BILLING_CYCLE_DAYS) {
      newErrors.billingCycleDays = `Minimum ${MIN_BILLING_CYCLE_DAYS} day`;
    } else if (daysValue > MAX_BILLING_CYCLE_DAYS) {
      newErrors.billingCycleDays = `Maximum ${MAX_BILLING_CYCLE_DAYS} days`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    const data: CreatePlanData = {
      name: name.trim(),
      price: BigInt(usdcToUnits(parseFloat(priceUSDC))),
      billingCycleDays: parseInt(billingCycleDays, 10),
    };

    await onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Plan Name */}
      <div>
        <label
          htmlFor="planName"
          className="block text-sm font-medium text-gray-300 mb-2"
        >
          Plan Name
        </label>
        <input
          type="text"
          id="planName"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Premium, Basic, Pro"
          maxLength={MAX_PLAN_NAME_LENGTH}
          className={`w-full px-4 py-3 bg-gray-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition-colors ${
            errors.name
              ? "border-red-500 focus:ring-red-500"
              : "border-gray-600 focus:ring-purple-500"
          }`}
          disabled={isSubmitting}
        />
        <div className="flex justify-between mt-1">
          {errors.name ? (
            <p className="text-sm text-red-400">{errors.name}</p>
          ) : (
            <span></span>
          )}
          <p className="text-sm text-gray-400">
            {name.length}/{MAX_PLAN_NAME_LENGTH}
          </p>
        </div>
      </div>

      {/* Price */}
      <div>
        <label
          htmlFor="price"
          className="block text-sm font-medium text-gray-300 mb-2"
        >
          Price (USDC)
        </label>
        <div className="relative">
          <input
            type="number"
            id="price"
            value={priceUSDC}
            onChange={(e) => setPriceUSDC(e.target.value)}
            placeholder="0.00"
            step="0.001"
            min="0"
            className={`w-full px-4 py-3 bg-gray-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition-colors pr-16 ${
              errors.price
                ? "border-red-500 focus:ring-red-500"
                : "border-gray-600 focus:ring-purple-500"
            }`}
            disabled={isSubmitting}
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
            USDC
          </span>
        </div>
        {errors.price && (
          <p className="mt-1 text-sm text-red-400">{errors.price}</p>
        )}
      </div>

      {/* Billing Cycle */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Billing Cycle
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
          {BILLING_CYCLE_PRESETS.map((preset) => (
            <button
              key={preset.value}
              type="button"
              onClick={() => setBillingCyclePreset(preset.value)}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                billingCyclePreset === preset.value
                  ? "bg-purple-600 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
              disabled={isSubmitting}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {billingCyclePreset === 0 && (
          <div className="mt-3">
            <label
              htmlFor="customDays"
              className="block text-sm text-gray-400 mb-1"
            >
              Custom days
            </label>
            <input
              type="number"
              id="customDays"
              value={billingCycleDays}
              onChange={(e) => setBillingCycleDays(e.target.value)}
              placeholder="Number of days"
              min={MIN_BILLING_CYCLE_DAYS}
              max={MAX_BILLING_CYCLE_DAYS}
              className={`w-full px-4 py-3 bg-gray-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition-colors ${
                errors.billingCycleDays
                  ? "border-red-500 focus:ring-red-500"
                  : "border-gray-600 focus:ring-purple-500"
              }`}
              disabled={isSubmitting}
            />
          </div>
        )}
        {errors.billingCycleDays && (
          <p className="mt-1 text-sm text-red-400">{errors.billingCycleDays}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex space-x-4 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all duration-200 flex items-center justify-center"
        >
          {isSubmitting ? (
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
              {mode === "create" ? "Creating..." : "Updating..."}
            </>
          ) : mode === "create" ? (
            "Create Plan"
          ) : (
            "Update Plan"
          )}
        </button>
      </div>
    </form>
  );
}
