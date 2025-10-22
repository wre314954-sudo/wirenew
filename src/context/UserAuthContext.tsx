import { ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { auth, db } from "@/lib/firebase";
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import {
  getUserOrders,
  getUserInquiries,
  ensureUserProfileExists,
  saveUserProfile,
  getUserProfileData,
  findUserByPhoneNumber,
  type OrderData,
  type InquiryData,
  type UserProfileData
} from "@/lib/firebase-services";

const USER_AUTH_STORAGE_KEY = "wirebazaar-user";
const USER_OTP_STORAGE_KEY = "wirebazaar-otp";

type UserProfile = UserProfileData & {
  id: string;
};

type PendingOTP = {
  otpHash: string;
  expiresAt: number;
  attempts: number;
  userId: string;
  phoneNumber: string;
};

type SignupData = {
  fullName: string;
  email: string;
  password: string;
  phoneNumber: string;
};

type UserAuthContextValue = {
  user: UserProfile | null;
  isAuthenticated: boolean;
  orders: OrderData[];
  inquiries: InquiryData[];
  isLoadingUserData: boolean;
  isSignup: boolean;
  pendingOtp: PendingOTP | null;
  signup: (data: SignupData) => Promise<void>;
  verifyOtp: (otp: string) => Promise<void>;
  login: (emailOrPhone: string, password: string) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  updatePhoneNumber: (phoneNumber: string) => Promise<void>;
  verifyPhoneOtp: (otp: string) => Promise<void>;
  logout: () => void;
};

const UserAuthContext = createContext<UserAuthContextValue | undefined>(undefined);

const bufferToHex = (buffer: ArrayBuffer) => {
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

const hashOtp = async (otp: string) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(otp);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return bufferToHex(digest);
};

const TEST_OTP = "123456";

const isValidEmail = (value: string) => {
  return /^(?:[a-zA-Z0-9_!#$%&'*+/=?`{|}~^.-]+)@(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/u.test(value.trim());
};

const isValidPhone = (value: string) => {
  return /^[6-9]\d{9}$/.test(value.trim().replace(/[\s-]/g, ''));
};

export const UserAuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [pendingOtp, setPendingOtp] = useState<PendingOTP | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSignup, setIsSignup] = useState(false);
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [inquiries, setInquiries] = useState<InquiryData[]>([]);
  const [isLoadingUserData, setIsLoadingUserData] = useState(false);

  const loadUserData = useCallback(async (userId: string) => {
    setIsLoadingUserData(true);
    try {
      const [userOrders, userInquiries] = await Promise.all([
        getUserOrders(userId),
        getUserInquiries(userId)
      ]);
      setOrders(userOrders);
      setInquiries(userInquiries);
    } catch (error) {
      if (error && (error instanceof Error && (error.name === 'AbortError' || error.message?.includes('abort')))) {
        return;
      }
      console.error('Failed to load user data:', error);
      setOrders([]);
      setInquiries([]);
    } finally {
      setIsLoadingUserData(false);
    }
  }, []);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const stored = localStorage.getItem(USER_AUTH_STORAGE_KEY);
        if (stored) {
          const parsed: UserProfile = JSON.parse(stored);
          if (parsed?.id) {
            setUser(parsed);
            await loadUserData(parsed.id);
          }
        }
      } catch (error) {
        console.error("Failed to restore user session", error);
      } finally {
        setIsInitialized(true);
      }
    };

    initializeAuth();

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        console.log('User signed out');
        setOrders([]);
        setInquiries([]);
        setUser(null);
        return;
      }

      try {
        const profileData = await getUserProfileData(firebaseUser.uid);
        
        if (profileData) {
          const profile: UserProfile = {
            id: firebaseUser.uid,
            ...profileData
          };
          setUser(profile);
          localStorage.setItem(USER_AUTH_STORAGE_KEY, JSON.stringify(profile));
          await loadUserData(firebaseUser.uid);
          console.log(`User session restored for UID: ${firebaseUser.uid}`);
        }
      } catch (error) {
        console.error('Error syncing Firebase auth state:', error);
      }
    });

    return () => unsubscribe();
  }, [loadUserData]);

  const signup = useCallback(async (data: SignupData) => {
    if (!isValidEmail(data.email)) {
      throw new Error("Please enter a valid email address.");
    }
    if (!isValidPhone(data.phoneNumber)) {
      throw new Error("Please enter a valid 10-digit phone number (India).");
    }
    if (data.password.length < 6) {
      throw new Error("Password must be at least 6 characters.");
    }

    try {
      setIsSignup(true);
      let userId: string;

      try {
        const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
        userId = userCredential.user.uid;
        console.log(`New user created with UID: ${userId}`);
      } catch (error: any) {
        if (error.code === 'auth/email-already-in-use') {
          try {
            const userCredential = await signInWithEmailAndPassword(auth, data.email, data.password);
            userId = userCredential.user.uid;
            console.log(`Returning user logged in with existing UID: ${userId}`);
          } catch (signInError: any) {
            throw new Error('This email is already registered. Please log in with your password instead.');
          }
        } else {
          throw error;
        }
      }

      await ensureUserProfileExists(userId, {
        fullName: data.fullName,
        email: data.email,
        phoneNumber: data.phoneNumber,
        verified: false
      });

      const otpHash = await hashOtp(TEST_OTP);
      const expiresAt = Date.now() + 10 * 60 * 1000;

      setPendingOtp({
        otpHash,
        expiresAt,
        attempts: 0,
        userId,
        phoneNumber: data.phoneNumber
      });

      localStorage.setItem(USER_OTP_STORAGE_KEY, JSON.stringify({ userId, phoneNumber: data.phoneNumber }));

      toast.success("OTP sent! Please verify your phone number.", {
        description: `Verification code sent to ${data.phoneNumber}. Test OTP: 123456`,
      });
    } catch (error: any) {
      console.error('Signup failed:', error);
      throw new Error(error.message || 'Signup failed. Please try again.');
    } finally {
      setIsSignup(false);
    }
  }, []);

  const verifyOtp = useCallback(async (otp: string) => {
    if (!pendingOtp) {
      throw new Error("No pending OTP verification.");
    }

    if (Date.now() > pendingOtp.expiresAt) {
      setPendingOtp(null);
      throw new Error("OTP has expired. Please sign up again.");
    }

    if (pendingOtp.attempts >= 4) {
      setPendingOtp(null);
      throw new Error("Too many incorrect attempts. Please sign up again.");
    }

    if (!/^[0-9]{6}$/.test(otp.trim())) {
      throw new Error("Enter the 6-digit OTP.");
    }

    try {
      const candidateHash = await hashOtp(otp.trim());
      if (candidateHash !== pendingOtp.otpHash) {
        setPendingOtp(prev => (prev ? { ...prev, attempts: prev.attempts + 1 } : prev));
        throw new Error("Incorrect OTP. Please try again.");
      }

      await ensureUserProfileExists(pendingOtp.userId, {
        phoneNumber: pendingOtp.phoneNumber,
        verified: true
      });

      const profileData = await getUserProfileData(pendingOtp.userId);
      if (profileData) {
        const profile: UserProfile = {
          id: pendingOtp.userId,
          ...profileData
        };
        setUser(profile);
        localStorage.setItem(USER_AUTH_STORAGE_KEY, JSON.stringify(profile));
      }

      await loadUserData(pendingOtp.userId);
      setPendingOtp(null);
      localStorage.removeItem(USER_OTP_STORAGE_KEY);

      toast.success("Phone verified successfully!", {
        description: "You are now logged in.",
      });
    } catch (error: any) {
      console.error('OTP verification failed:', error);
      throw error;
    }
  }, [pendingOtp, loadUserData]);

  const login = useCallback(async (emailOrPhone: string, password: string) => {
    try {
      let email = emailOrPhone.trim();

      if (!isValidEmail(emailOrPhone)) {
        if (isValidPhone(emailOrPhone)) {
          const foundUser = await findUserByPhoneNumber(emailOrPhone.trim());
          if (!foundUser) {
            throw new Error('No account found with this phone number. Please sign up first.');
          }
          email = foundUser.email;
          console.log(`Found email ${email} for phone number ${emailOrPhone}`);
        } else {
          throw new Error("Please enter a valid email address or phone number.");
        }
      }

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const userId = userCredential.user.uid;

      const profileData = await getUserProfileData(userId);
      if (profileData && profileData.verified) {
        const profile: UserProfile = {
          id: userId,
          ...profileData
        };
        setUser(profile);
        localStorage.setItem(USER_AUTH_STORAGE_KEY, JSON.stringify(profile));
        await loadUserData(userId);
        console.log(`User logged in successfully with UID: ${userId}`);
      } else {
        console.log(`User logged in but profile not fully verified for UID: ${userId}`);
      }

      toast.success("Login successful!", {
        description: "Welcome back!",
      });
    } catch (error: any) {
      console.error('Login failed:', error);
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        throw new Error('Invalid email/phone number or password.');
      }
      throw new Error(error.message || 'Login failed. Please try again.');
    }
  }, [loadUserData]);

  const requestPasswordReset = useCallback(async (email: string) => {
    if (!isValidEmail(email)) {
      throw new Error("Please enter a valid email address.");
    }

    try {
      const { sendPasswordResetEmail } = await import('@/lib/firebase-services');
      await sendPasswordResetEmail(email);
      
      toast.success("Password reset email sent!", {
        description: "Check your email for password reset instructions.",
      });
    } catch (error: any) {
      console.error('Password reset request failed:', error);
      throw new Error(error.message || 'Failed to send password reset email.');
    }
  }, []);

  const updatePhoneNumber = useCallback(async (phoneNumber: string) => {
    if (!user) {
      throw new Error("User not logged in.");
    }
    
    if (!isValidPhone(phoneNumber)) {
      throw new Error("Please enter a valid 10-digit phone number (India).");
    }

    try {
      const otpHash = await hashOtp(TEST_OTP);
      const expiresAt = Date.now() + 10 * 60 * 1000;

      setPendingOtp({
        otpHash,
        expiresAt,
        attempts: 0,
        userId: user.id,
        phoneNumber
      });

      toast.success("Verification OTP sent!", {
        description: `OTP sent to ${phoneNumber}. Test OTP: 123456`,
      });
    } catch (error) {
      console.error('Failed to send OTP:', error);
      throw new Error('Failed to send OTP. Please try again.');
    }
  }, [user]);

  const verifyPhoneOtp = useCallback(async (otp: string) => {
    if (!pendingOtp || !user) {
      throw new Error("No pending phone verification.");
    }

    if (Date.now() > pendingOtp.expiresAt) {
      setPendingOtp(null);
      throw new Error("OTP has expired. Please request a new one.");
    }

    if (pendingOtp.attempts >= 4) {
      setPendingOtp(null);
      throw new Error("Too many incorrect attempts. Please request a new OTP.");
    }

    if (!/^[0-9]{6}$/.test(otp.trim())) {
      throw new Error("Enter the 6-digit OTP.");
    }

    try {
      const candidateHash = await hashOtp(otp.trim());
      if (candidateHash !== pendingOtp.otpHash) {
        setPendingOtp(prev => (prev ? { ...prev, attempts: prev.attempts + 1 } : prev));
        throw new Error("Incorrect OTP. Please try again.");
      }

      await saveUserProfile(user.id, {
        phoneNumber: pendingOtp.phoneNumber,
        verified: true
      });

      setUser(prev => prev ? { ...prev, phoneNumber: pendingOtp.phoneNumber, verified: true } : null);
      const profile = { ...user, phoneNumber: pendingOtp.phoneNumber, verified: true };
      localStorage.setItem(USER_AUTH_STORAGE_KEY, JSON.stringify(profile));

      setPendingOtp(null);

      toast.success("Phone number updated successfully!", {
        description: `Your new phone number is ${pendingOtp.phoneNumber}`,
      });
    } catch (error: any) {
      console.error('Phone verification failed:', error);
      throw error;
    }
  }, [pendingOtp, user]);

  const logout = useCallback(() => {
    setUser(null);
    setOrders([]);
    setInquiries([]);
    setPendingOtp(null);
    localStorage.removeItem(USER_AUTH_STORAGE_KEY);
    localStorage.removeItem(USER_OTP_STORAGE_KEY);
    signOut(auth).catch(() => {});
    toast.info("You have been logged out.");
  }, []);

  const value = useMemo<UserAuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user && user.verified),
      orders,
      inquiries,
      isLoadingUserData,
      isSignup,
      pendingOtp,
      signup,
      verifyOtp,
      login,
      requestPasswordReset,
      updatePhoneNumber,
      verifyPhoneOtp,
      logout,
    }),
    [logout, signup, verifyOtp, login, requestPasswordReset, updatePhoneNumber, verifyPhoneOtp, user, orders, inquiries, isLoadingUserData, isSignup, pendingOtp],
  );

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-accent/10 to-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Initializing...</p>
        </div>
      </div>
    );
  }

  return <UserAuthContext.Provider value={value}>{children}</UserAuthContext.Provider>;
};

export const useUserAuth = () => {
  const context = useContext(UserAuthContext);
  if (!context) {
    throw new Error("useUserAuth must be used within a UserAuthProvider");
  }
  return context;
};
