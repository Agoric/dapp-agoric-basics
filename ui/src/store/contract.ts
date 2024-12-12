import type { Brand } from '@agoric/web-components';
import { create } from 'zustand';

interface ContractState {
  instances?: Record<string, unknown>;
  brands?: Record<string, Brand>;
}

export const useContractStore = create<ContractState>(() => ({}));
