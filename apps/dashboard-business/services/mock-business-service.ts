import type { Business, CreateBusinessInput } from '@/types/business';
import { STORAGE_KEYS } from '@/lib/constants';

function generateId(): string {
  return `biz_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function getBusinessesFromStorage(): Record<string, Business> {
  if (typeof window === 'undefined') return {};
  const data = localStorage.getItem(STORAGE_KEYS.BUSINESSES);
  if (!data) return {};
  return JSON.parse(data);
}

function saveBusinessesToStorage(businesses: Record<string, Business>): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.BUSINESSES, JSON.stringify(businesses));
}

export const mockBusinessService = {
  async getBusinessByWallet(walletAddress: string): Promise<Business | null> {
    await new Promise((resolve) => setTimeout(resolve, 100));
    const businesses = getBusinessesFromStorage();
    return businesses[walletAddress] || null;
  },

  async createBusiness(input: CreateBusinessInput): Promise<Business> {
    await new Promise((resolve) => setTimeout(resolve, 200));

    const businesses = getBusinessesFromStorage();
    const now = new Date().toISOString();
    const newBusiness: Business = {
      id: generateId(),
      walletAddress: input.walletAddress,
      name: input.name.trim(),
      createdAt: now,
      updatedAt: now,
    };

    businesses[input.walletAddress] = newBusiness;
    saveBusinessesToStorage(businesses);
    return newBusiness;
  },

  async updateBusinessName(
    walletAddress: string,
    name: string
  ): Promise<Business> {
    await new Promise((resolve) => setTimeout(resolve, 200));

    const businesses = getBusinessesFromStorage();
    const business = businesses[walletAddress];
    if (!business) {
      throw new Error('事業者情報が見つかりません');
    }

    const updatedBusiness: Business = {
      ...business,
      name: name.trim(),
      updatedAt: new Date().toISOString(),
    };

    businesses[walletAddress] = updatedBusiness;
    saveBusinessesToStorage(businesses);
    return updatedBusiness;
  },
};
