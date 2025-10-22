import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  UserCredential,
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';
import { toast } from 'sonner';

export interface SignUpData {
  email: string;
  password: string;
  phoneNumber: string;
}

export interface SignInData {
  email: string;
  password: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  phoneNumber: string;
  displayName?: string;
  createdAt?: any;
  updatedAt?: any;
}

/**
 * Sign up with email, password, and phone number
 * Creates Firebase Auth user and Firestore profile document
 */
export const signUpUser = async (data: SignUpData): Promise<UserCredential> => {
  try {
    const { email, password, phoneNumber } = data;

    if (!email || !password || !phoneNumber) {
      throw new Error('Email, password, and phone number are required');
    }

    console.log('Creating user with email:', email);
    const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
    const uid = userCredential.user.uid;

    console.log(`User created with UID: ${uid}`);

    // Create user profile in Firestore
    const userRef = doc(db, 'user_profiles', uid);
    await setDoc(userRef, {
      uid,
      email: email.trim(),
      phoneNumber: phoneNumber.trim(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    console.log(`User profile created in Firestore for UID: ${uid}`);
    toast.success('Account created successfully!');

    return userCredential;
  } catch (error: any) {
    console.error('Sign up failed:', error.code, error.message);

    if (error.code === 'auth/email-already-in-use') {
      throw new Error('Email already registered. Please sign in instead.');
    } else if (error.code === 'auth/weak-password') {
      throw new Error('Password is too weak. Please use at least 6 characters.');
    } else if (error.code === 'auth/invalid-email') {
      throw new Error('Invalid email address.');
    } else if (error.code === 'auth/network-request-failed') {
      throw new Error('Network error. Please check your internet connection.');
    }

    throw new Error(error.message || 'Sign up failed. Please try again.');
  }
};

/**
 * Sign in with email and password
 */
export const signInUser = async (data: SignInData): Promise<UserCredential> => {
  try {
    const { email, password } = data;

    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    console.log('Signing in user with email:', email);
    const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
    const uid = userCredential.user.uid;

    // Verify user profile exists in Firestore
    const userRef = doc(db, 'user_profiles', uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      // Profile doesn't exist - sign them out and require signup
      await signOut(auth);
      throw new Error('No account found. Please sign up first.');
    }

    console.log(`User signed in with UID: ${uid}`);
    toast.success('Signed in successfully!');

    return userCredential;
  } catch (error: any) {
    console.error('Sign in failed:', error.code, error.message);

    if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
      throw new Error('Invalid email or password.');
    } else if (error.code === 'auth/invalid-email') {
      throw new Error('Invalid email address.');
    } else if (error.code === 'auth/network-request-failed') {
      throw new Error('Network error. Please check your internet connection.');
    }

    throw new Error(error.message || 'Sign in failed. Please try again.');
  }
};

/**
 * Fetch user profile from Firestore
 */
export const getUserProfileFromFirestore = async (uid: string): Promise<UserProfile | null> => {
  try {
    const userRef = doc(db, 'user_profiles', uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      return userSnap.data() as UserProfile;
    }

    return null;
  } catch (error: any) {
    console.error('Failed to fetch user profile:', error);
    return null;
  }
};

/**
 * Update user profile
 */
export const updateUserProfile = async (uid: string, updates: Partial<UserProfile>): Promise<void> => {
  try {
    const userRef = doc(db, 'user_profiles', uid);
    await updateDoc(userRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });

    // Also update Firebase Auth displayName if provided
    if (auth.currentUser && updates.displayName) {
      await updateProfile(auth.currentUser, {
        displayName: updates.displayName,
      });
    }

    console.log(`User profile updated for UID: ${uid}`);
    toast.success('Profile updated successfully!');
  } catch (error: any) {
    console.error('Failed to update profile:', error);
    throw new Error(error.message || 'Failed to update profile.');
  }
};

/**
 * Sign out user
 */
export const signOutUser = async (): Promise<void> => {
  try {
    await signOut(auth);
    console.log('User signed out');
    toast.success('Signed out successfully!');
  } catch (error: any) {
    console.error('Sign out failed:', error);
    throw new Error('Failed to sign out.');
  }
};
