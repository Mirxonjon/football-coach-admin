import { create } from "zustand";
import { persist } from "zustand/middleware";
import { tokenStore } from "@/lib/api";

export type AdminUser = {
  id: number;
  email?: string | null;
  phone?: string;
  firstName?: string | null;
  lastName?: string | null;
  avatarUrl?: string | null;
};

type AuthState = {
  user: AdminUser | null;
  setAuth: (
    u: AdminUser,
    access: string,
    refresh: string,
    expiresIn?: number
  ) => void;
  setUser: (u: AdminUser | null) => void;
  logout: () => void;
};

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      setAuth: (user, access, refresh, expiresIn) => {
        tokenStore.save({
          accessToken: access,
          refreshToken: refresh,
          expiresIn,
        });
        set({ user });
      },
      setUser: (user) => set({ user }),
      logout: () => {
        tokenStore.clear();
        set({ user: null });
      },
    }),
    { name: "fc_admin_user" }
  )
);
