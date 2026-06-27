import { create } from 'zustand';

type AuthTab = 'login' | 'register';

interface AuthModalState {
  showAuthModal: boolean;
  authModalTab: AuthTab;
  openAuthModal: (tab?: AuthTab) => void;
  closeAuthModal: () => void;
}

export const useAuthModalStore = create<AuthModalState>((set) => ({
  showAuthModal: false,
  authModalTab: 'login',
  openAuthModal: (tab = 'login') => set({ showAuthModal: true, authModalTab: tab }),
  closeAuthModal: () => set({ showAuthModal: false }),
}));
