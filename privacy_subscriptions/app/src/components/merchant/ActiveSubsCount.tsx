"use client";

interface ActiveSubsCountProps {
  count: number;
  isLoading?: boolean;
}

export function ActiveSubsCount({
  count,
  isLoading = false,
}: ActiveSubsCountProps) {
  // Loading skeleton
  if (isLoading) {
    return (
      <div className="bg-gray-800 rounded-xl p-6 animate-pulse">
        <div className="h-4 bg-gray-700 rounded w-3/4 mb-3"></div>
        <div className="h-8 bg-gray-700 rounded w-1/2"></div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-xl p-6">
      <p className="text-sm text-gray-400 mb-2">Active Subscribers</p>
      <p className="text-2xl font-bold text-white">{count.toLocaleString()}</p>
    </div>
  );
}
