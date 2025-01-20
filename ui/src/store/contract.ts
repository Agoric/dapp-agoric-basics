import { create } from 'zustand';

interface ContractState {
  instances?: Record<string, unknown>;
  brands?: Record<string, Brand>;
}

export const useContractStore = create<ContractState>(() => ({}));
