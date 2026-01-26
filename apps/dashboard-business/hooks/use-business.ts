'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import type { Business } from '@/types/business';
import { mockBusinessService } from '@/services/mock-business-service';

export function useBusiness() {
  const { publicKey } = useWallet();
  const [business, setBusiness] = useState<Business | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const walletAddress = publicKey?.toBase58() || '';

  const fetchBusiness = useCallback(async () => {
    if (!walletAddress) {
      setBusiness(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const data = await mockBusinessService.getBusinessByWallet(walletAddress);
      setBusiness(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '事業者情報の取得に失敗しました'
      );
    } finally {
      setIsLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    fetchBusiness();
  }, [fetchBusiness]);

  const registerBusiness = async (name: string): Promise<Business> => {
    if (!walletAddress) {
      throw new Error('ウォレットが接続されていません');
    }

    const newBusiness = await mockBusinessService.createBusiness({
      walletAddress,
      name,
    });
    setBusiness(newBusiness);
    return newBusiness;
  };

  const updateBusinessName = async (name: string): Promise<Business> => {
    if (!walletAddress) {
      throw new Error('ウォレットが接続されていません');
    }

    const updatedBusiness = await mockBusinessService.updateBusinessName(
      walletAddress,
      name
    );
    setBusiness(updatedBusiness);
    return updatedBusiness;
  };

  const isRegistered = business !== null;

  return {
    business,
    isLoading,
    error,
    isRegistered,
    fetchBusiness,
    registerBusiness,
    updateBusinessName,
  };
}
