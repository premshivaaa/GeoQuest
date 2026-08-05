import { create } from 'zustand';

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  level: number;
  xp: number;
  coins: number;
  rank: string;
  accuracy: number;
}

interface GameState {
  token: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
  updateUserStats: (xpDelta: number, coinDelta: number) => void;
}

const useStore = create<GameState>((set) => ({
  token: localStorage.getItem('token'),
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  setAuth: (token, user) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    set({ token, user });
  },
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ token: null, user: null });
  },
  updateUserStats: (xpDelta, coinDelta) => set((state) => {
    if (!state.user) return state;
    const updatedUser = {
      ...state.user,
      xp: state.user.xp + xpDelta,
      coins: state.user.coins + coinDelta
    };
    localStorage.setItem('user', JSON.stringify(updatedUser));
    return { user: updatedUser };
  })
}));

export default useStore;
