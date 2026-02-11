import type { AuthData } from "@/types/auth";
import type { Keypair, Session } from "@synonymdev/pubky";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { config } from "@/lib/config";

const STORAGE_KEY = "bot-configurator-auth";

const defaultAuthData: AuthData & {
  sessionExport: string | null;
  isHydrated: boolean;
  isRestoringSession: boolean;
} = {
  isAuthenticated: false,
  publicKey: null,
  keypair: null,
  session: null,
  sessionExport: null,
  isHydrated: false,
  isRestoringSession: false,
};

interface AuthStore extends AuthData {
  sessionExport: string | null;
  isHydrated: boolean;
  isRestoringSession: boolean;
  signin: (publicKey: string, keypair: Keypair, session: Session) => void;
  signinWithSession: (publicKey: string, session: Session) => void;
  restoreSessionFromExport: () => Promise<void>;
  logout: () => void;
  setIsHydrated: (isHydrated: boolean) => void;
  setIsRestoringSession: (isRestoring: boolean) => void;
}

const safeSessionExport = (session: Session | null): string | null => {
  if (!session) return null;
  try {
    return typeof session.export === "function" ? session.export() : null;
  } catch (error) {
    console.warn("session.export() failed; skipping persistence", error);
    return null;
  }
};

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      ...defaultAuthData,

      signin: (publicKey, keypair, session) => {
        set({
          isAuthenticated: true,
          publicKey,
          keypair,
          session,
          sessionExport: safeSessionExport(session),
        });

        // Register user with indexer
        fetch("/api/indexer/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ publicKey }),
        }).catch(console.error);
      },

      signinWithSession: (publicKey, session) => {
        set({
          isAuthenticated: true,
          publicKey,
          keypair: null, // Pubky Ring auth does not return the keypair
          session,
          sessionExport: safeSessionExport(session),
        });

        // Register user with indexer
        fetch("/api/indexer/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ publicKey }),
        }).catch(console.error);
      },

      restoreSessionFromExport: async () => {
        const { sessionExport, session, publicKey } = get();
        if (!sessionExport || session) return;

        set({ isRestoringSession: true });

        try {
          const { Pubky } = await import("@synonymdev/pubky");
          const sdk =
            config.env === "testnet" ? Pubky.testnet() : new Pubky();
          const restoredSession = await Promise.race([
            sdk.restoreSession(sessionExport),
            new Promise<Session>((_, reject) =>
              setTimeout(() => reject(new Error("restoreSession timeout")), 8000)
            ),
          ]);

          set({
            isAuthenticated: true,
            publicKey,
            keypair: null,
            session: restoredSession,
            sessionExport: safeSessionExport(restoredSession),
            isRestoringSession: false,
          });
        } catch (error) {
          console.warn(
            "Failed to restore session from export; clearing snapshot",
            error
          );
          set({
            isAuthenticated: false,
            publicKey: null,
            keypair: null,
            session: null,
            sessionExport: null,
            isRestoringSession: false,
          });
        }
      },

      logout: () => {
        set({
          ...defaultAuthData,
          isHydrated: true,
        });
      },

      setIsHydrated: (isHydrated: boolean) => set({ isHydrated }),
      setIsRestoringSession: (isRestoring: boolean) =>
        set({ isRestoringSession: isRestoring }),
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        publicKey: state.publicKey,
        sessionExport: state.sessionExport,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setIsHydrated(true);
          if (state.sessionExport) {
            state.setIsRestoringSession(true);
          }
        }
      },
    }
  )
);
