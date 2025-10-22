import type { InquiryData } from "@/pages/Inquiry";
import { db } from './firebase';
import { collection, doc, setDoc, getDocs, query, orderBy as firestoreOrderBy, where, serverTimestamp } from 'firebase/firestore';

export interface StoredInquiry extends InquiryData {
  id: string;
  userId: string;
  createdAt: string;
}

export const INQUIRY_STORAGE_KEY = "owner-dashboard-inquiries";

type ParsedValue = unknown;

const isStoredInquiryArray = (value: ParsedValue): value is StoredInquiry[] => {
  if (!Array.isArray(value)) {
    return false;
  }

  return value.every((item) =>
    item &&
    typeof item === "object" &&
    "id" in item &&
    "userId" in item &&
    "createdAt" in item &&
    "userType" in item &&
    "contactPhone" in item &&
    "contactEmail" in item &&
    "contactName" in item,
  );
};

const readStorage = (): StoredInquiry[] => {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(INQUIRY_STORAGE_KEY);

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as ParsedValue;

    if (!isStoredInquiryArray(parsed)) {
      return [];
    }

    return parsed;
  } catch (error) {
    console.error("Failed to read inquiries from storage", error);
    return [];
  }
};

const writeStorage = (value: StoredInquiry[]) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(INQUIRY_STORAGE_KEY, JSON.stringify(value));
  } catch (error) {
    console.error("Failed to write inquiries to storage", error);
  }
};

export const getStoredInquiries = async (userId?: string): Promise<StoredInquiry[]> => {
  try {
    const inquiriesRef = collection(db, 'inquiries');

    if (userId) {
      const q = query(
        inquiriesRef,
        where('userId', '==', userId),
        firestoreOrderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const inquiries: StoredInquiry[] = [];
      querySnapshot.forEach((doc) => {
        inquiries.push({ id: doc.id, ...doc.data() } as StoredInquiry);
      });
      return inquiries;
    } else {
      const q = query(inquiriesRef, firestoreOrderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const inquiries: StoredInquiry[] = [];
      querySnapshot.forEach((doc) => {
        inquiries.push({ id: doc.id, ...doc.data() } as StoredInquiry);
      });
      return inquiries;
    }
  } catch (error) {
    console.error('Error fetching inquiries from Firebase:', error);
    return readStorage();
  }
};

export const addInquiryToStorage = async (data: InquiryData): Promise<StoredInquiry> => {
  if (!data.userId) {
    throw new Error('User ID is required to save inquiry');
  }

  const newInquiry: StoredInquiry = {
    ...data,
    userId: data.userId,
    id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}`,
    createdAt: new Date().toISOString(),
  };

  try {
    const inquiryRef = doc(db, 'inquiries', newInquiry.id);
    await setDoc(inquiryRef, {
      ...data,
      userId: data.userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      status: 'pending'
    }, { merge: true });
    console.log(`Inquiry saved to Firebase for userId: ${data.userId}`);
  } catch (error) {
    console.error('Error saving inquiry to Firebase:', error);
    throw error;
  }

  const inquiries = [...readStorage(), newInquiry];
  writeStorage(inquiries);
  return newInquiry;
};

export const clearStoredInquiries = () => {
  writeStorage([]);
};

export const removeInquiryFromStorage = (id: string) => {
  const next = readStorage().filter((inquiry) => inquiry.id !== id);
  writeStorage(next);
};
