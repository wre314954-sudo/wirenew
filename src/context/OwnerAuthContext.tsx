import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { toast } from 'sonner';
import { ADMIN_UID } from '@/lib/firebase-services';

const OWNER_AUTH_STORAGE_KEY = "owner-dashboard-authenticated";
const OWNER_UID_KEY = "owner-uid";

interface OwnerAuthContextValue {
  isAuthenticated: boolean;
  userId: string | null;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const OwnerAuthContext = createContext<OwnerAuthContextValue | undefined>(undefined);

export const OwnerAuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (typeof window === "undefined") {
      return false;
    }
    return window.localStorage.getItem(OWNER_AUTH_STORAGE_KEY) === "true";
  });

  const [userId, setUserId] = useState<string | null>(() => {
    if (typeof window === "undefined") {
      return null;
    }
    return window.localStorage.getItem(OWNER_UID_KEY);
  });

  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      setIsInitialized(true);
      return;
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key === OWNER_AUTH_STORAGE_KEY) {
        setIsAuthenticated(event.newValue === "true");
      }
      if (event.key === OWNER_UID_KEY) {
        setUserId(event.newValue);
      }
    };

    window.addEventListener("storage", handleStorage);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setIsInitialized(true);
        return;
      }

      try {
        const stored = window.localStorage.getItem(OWNER_AUTH_STORAGE_KEY);
        if (stored === "true" && firebaseUser.uid === ADMIN_UID) {
          const adminRef = doc(db, "user_profiles", ADMIN_UID);
          const adminSnap = await getDoc(adminRef);

          if (adminSnap.exists() && (adminSnap.data().role === "admin" || adminSnap.data().isAdmin === true)) {
            try {
              const idToken = await firebaseUser.getIdToken();
              if (idToken) {
                window.localStorage.setItem('firebase_id_token', idToken);
              }
            } catch (tokenErr) {
              console.warn('Failed to get id token:', tokenErr);
            }

            setUserId(ADMIN_UID);
            window.localStorage.setItem(OWNER_UID_KEY, ADMIN_UID);
            setIsAuthenticated(true);
            console.log(`Admin authenticated with UID: ${ADMIN_UID}`);
          }
        }
      } catch (error) {
        console.error("Error verifying admin auth state:", error);
      } finally {
        setIsInitialized(true);
      }
    });

    return () => {
      window.removeEventListener("storage", handleStorage);
      unsubscribe();
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password.trim());
      const uid = userCredential.user.uid;

      if (uid !== ADMIN_UID) {
        await signOut(auth);
        toast.error("Only the admin account can access the admin dashboard.");
        return false;
      }

      const adminRef = doc(db, "user_profiles", ADMIN_UID);
      const adminSnap = await getDoc(adminRef);

      if (!adminSnap.exists() || (adminSnap.data().role !== "admin" && adminSnap.data().isAdmin !== true)) {
        console.log("Admin profile not found or not marked as admin, creating/updating...");
        await setDoc(adminRef, {
          uid: ADMIN_UID,
          email: email.trim(),
          role: "admin",
          isAdmin: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }, { merge: true });
      } else {
        await setDoc(adminRef, {
          uid: ADMIN_UID,
          lastLoginAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }, { merge: true });
      }

      try {
        const idToken = await userCredential.user.getIdToken();
        if (idToken) {
          window.localStorage.setItem('firebase_id_token', idToken);
        }
      } catch (tokenErr) {
        console.warn('Failed to get id token:', tokenErr);
      }

      setUserId(ADMIN_UID);
      setIsAuthenticated(true);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(OWNER_AUTH_STORAGE_KEY, "true");
        window.localStorage.setItem(OWNER_UID_KEY, ADMIN_UID);
      }

      toast.success("Admin login successful");
      return true;
    } catch (error: any) {
      console.error("Admin login failed:", error);
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        toast.error("Invalid email or password.");
      } else {
        toast.error("Admin login failed. Please try again.");
      }
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    setIsAuthenticated(false);
    setUserId(null);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(OWNER_AUTH_STORAGE_KEY);
      window.localStorage.removeItem(OWNER_UID_KEY);
      window.localStorage.removeItem('firebase_id_token');
    }
    try {
      signOut(auth).catch(() => {});
    } catch (e) {
      console.error("Logout error:", e);
    }
    toast.info("Admin logged out");
  }, []);

  const value = useMemo(
    () => ({
      isAuthenticated,
      userId,
      isAdmin: isAuthenticated && userId === ADMIN_UID,
      login,
      logout,
    }),
    [isAuthenticated, userId, login, logout],
  );

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-accent/10 to-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Initializing admin access...</p>
        </div>
      </div>
    );
  }

  return <OwnerAuthContext.Provider value={value}>{children}</OwnerAuthContext.Provider>;
};

export const useOwnerAuth = () => {
  const context = useContext(OwnerAuthContext);

  if (!context) {
    throw new Error("useOwnerAuth must be used within an OwnerAuthProvider");
  }

  return context;
};
