export interface Business {
  id: string;
  walletAddress: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBusinessInput {
  walletAddress: string;
  name: string;
}
