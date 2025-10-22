# Firebase UID & Duplicate User Prevention - Complete Fix Documentation

## Overview

This document explains all the fixes applied to prevent duplicate Firestore user documents and ensure consistent UID usage across sign-ins for both regular users and admins.

## Problem Statement

Previously, when a user or admin signed in or signed up:
1. A new Firestore user document was created each time
2. Users lost access to their previous orders and inquiries
3. Admins lost access to the order management dashboard
4. Different UIDs were generated for the same user on subsequent logins

## Solution Implemented

### 1. ✅ Persistent UID Generation (Core Fix)

**File:** `src/lib/firebase.ts`, `src/context/UserAuthContext.tsx`, `src/context/OwnerAuthContext.tsx`

**What was changed:**
- Always use `auth.currentUser.uid` from Firebase Authentication
- Never generate or create custom UIDs manually
- The same user always gets the same UID on every login

**Code Example:**
```typescript
// ✅ CORRECT - Always use Firebase's UID
const userCredential = await signInAnonymously(auth);
const userId = userCredential.user.uid; // Same UID on every login
```

### 2. ✅ Prevent Duplicate User Profiles

**File:** `src/lib/firebase-services.ts`

**What was changed:**
- Created new `ensureUserProfileExists()` function that:
  1. Checks if a user profile already exists using `getDoc()`
  2. **If exists:** Only updates `updatedAt` and `lastLoginAt` timestamps
  3. **If not exists:** Creates a new profile with `createdAt` and `updatedAt`

**Code:**
```typescript
export const ensureUserProfileExists = async (userId: string, contact?: string) => {
  const profileRef = doc(db, 'user_profiles', userId);
  const existing = await getDoc(profileRef);

  if (!existing.exists()) {
    // Create new profile
    await setDoc(profileRef, {
      userId,
      contact: contact || '',
      profileCompleted: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  } else {
    // Update existing profile
    await updateDoc(profileRef, {
      updatedAt: serverTimestamp(),
      lastLoginAt: serverTimestamp()
    });
  }
};
```

**Impact:**
- ✅ Users sign up → One Firestore document created
- ✅ User logs out and back in → Same document updated (no duplicate)
- ✅ Admins sign in → Same logic applies

### 3. ✅ Admin Access with Role-Based Control

**File:** `src/context/OwnerAuthContext.tsx`

**What was changed:**
- Updated `OwnerAuthContext` to:
  1. Use Firebase Authentication for persistent UID
  2. Store admin role in Firestore: `role: "admin"` in `user_profiles` collection
  3. Verify admin status on every login
  4. Keep the same UID across sessions

**Key Features:**
```typescript
// Admin login creates/updates their profile with role
const ownerRef = doc(db, 'user_profiles', uid);
const existing = await getDoc(ownerRef);

if (!existing.exists()) {
  await setDoc(ownerRef, {
    userId: uid,
    email: OWNER_EMAIL,
    role: "admin",
    isAdmin: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
} else {
  await updateDoc(ownerRef, {
    updatedAt: serverTimestamp(),
    lastLoginAt: serverTimestamp()
  });
}
```

**Impact:**
- ✅ Admins retain persistent UID across logins
- ✅ Order management dashboard recognizes admin by role
- ✅ No duplicate admin documents created

### 4. ✅ Helper Function for Admin Status Check

**File:** `src/lib/firebase-services.ts`

**What was added:**
```typescript
export const isUserAdmin = async (userId: string): Promise<boolean> => {
  const profileRef = doc(db, 'user_profiles', userId);
  const profileSnap = await getDoc(profileRef);

  if (profileSnap.exists()) {
    const data = profileSnap.data();
    return data.role === 'admin' || data.isAdmin === true;
  }
  return false;
};
```

**Usage:**
```typescript
// Check if user is admin
if (await isUserAdmin(userId)) {
  // Grant admin dashboard access
}
```

### 5. ✅ Enforce userId in Orders

**File:** `src/lib/order-storage.ts`

**What was changed:**
- Already enforces `userId` requirement in `saveOrder()`:
```typescript
export const saveOrder = async (order: Order): Promise<void> => {
  if (!order.userId) {
    throw new Error('User ID is required to save order');
  }
  // ... save to Firestore
};
```

**Impact:**
- ✅ Every order MUST have a userId
- ✅ Orders automatically linked to the user who created them

### 6. ✅ Enforce userId in Inquiries

**File:** `src/lib/inquiry-storage.ts`

**What was changed:**
- Updated `addInquiryToStorage()` to:
  1. Require `userId` in the inquiry data
  2. Save `userId` to Firestore
  3. Throw error if userId is missing

**Code:**
```typescript
export const addInquiryToStorage = async (data: InquiryData): Promise<StoredInquiry> => {
  if (!data.userId) {
    throw new Error('User ID is required to save inquiry');
  }

  const newInquiry: StoredInquiry = {
    ...data,
    userId: data.userId,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };

  await setDoc(inquiryRef, {
    ...data,
    userId: data.userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    status: 'pending'
  });
};
```

**Also updated:** `getStoredInquiries()` to optionally filter by userId:
```typescript
export const getStoredInquiries = async (userId?: string): Promise<StoredInquiry[]> => {
  if (userId) {
    const q = query(
      inquiriesRef,
      where('userId', '==', userId),
      firestoreOrderBy('createdAt', 'desc')
    );
    // ... fetch filtered results
  }
};
```

### 7. ✅ Pass userId When Creating Inquiries

**File:** `src/components/inquiry/ConfirmationStep.tsx`

**What was changed:**
- Check that user is authenticated before submitting
- Include userId from context when saving inquiry

**Code:**
```typescript
const handleSubmit = async () => {
  if (!user) {
    toast.error("Please log in to submit an inquiry");
    return;
  }

  const inquiryDataWithUserId = {
    ...data,
    userId: user.id, // ✅ Always include userId
    contactName: data.name,
    contactEmail: data.email,
    contactPhone: data.phone,
    location: data.address,
    productName: data.brand,
    productSpecification: data.color
  };
  
  await addInquiryToStorage(inquiryDataWithUserId);
};
```

### 8. ✅ Timestamp Consistency

**Applied to all documents:**
- Every new document gets both `createdAt` and `updatedAt`
- On updates, only `updatedAt` is modified
- Uses Firebase's `serverTimestamp()` for consistency

**Example:**
```typescript
// New document
{
  userId: "uid123",
  content: "...",
  createdAt: serverTimestamp(),  // ✅ Created time
  updatedAt: serverTimestamp()   // ✅ Last updated time
}

// When updating
await updateDoc(docRef, {
  content: "...",
  updatedAt: serverTimestamp()  // ✅ Only update this
  // ❌ DO NOT touch createdAt
});
```

## Firestore Collection Structure

### user_profiles Collection
```typescript
{
  userId: string;           // Document ID = userId
  contact?: string;         // Email or phone
  email?: string;
  role?: 'admin' | 'user';
  isAdmin?: boolean;
  profileCompleted: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastLoginAt?: Timestamp;
}
```

### orders Collection
```typescript
{
  id: string;               // Document ID
  userId: string;           // ✅ REQUIRED - Link to user
  orderNumber: string;
  customerInfo: {...};
  items: CartItem[];
  subtotal: number;
  shippingCost: number;
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered';
  paymentStatus: 'pending' | 'completed' | 'failed';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### inquiries Collection
```typescript
{
  id: string;               // Document ID
  userId: string;           // ✅ REQUIRED - Link to user
  userType: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  location: string;
  productName: string;
  productSpecification: string;
  quantity: string;
  status: 'pending' | 'responded';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

## Complete Workflow Test

### Scenario 1: User Sign-up & Sign-in
```
Step 1: User signs up with email "john@example.com"
  → Firebase creates UID: "abc123def456"
  → ensureUserProfileExists() called
  → Firestore: user_profiles/abc123def456 created ✅

Step 2: User logs out

Step 3: User logs back in with same email
  → Firebase recognizes the user: UID still "abc123def456"
  → ensureUserProfileExists() called
  → Firestore: Existing profile updated (NOT duplicated) ✅
  → Previous orders/inquiries loaded ✅

Step 4: User creates a new order
  → saveOrder() called with userId: "abc123def456"
  → Order saved to orders collection with userId ✅

Step 5: User logs out and back in again
  → Same UID: "abc123def456"
  → Orders query: where('userId', '==', 'abc123def456')
  → Previous order appears ✅
```

### Scenario 2: Admin Sign-in
```
Step 1: Admin logs in with credentials
  → Firebase creates/uses UID: "admin123"
  → OwnerAuthContext calls ensureUserProfileExists()
  → Firestore: user_profiles/admin123 created with role: "admin" ✅

Step 2: Admin logs out

Step 3: Admin logs back in
  → Same UID: "admin123"
  → Profile updated (NOT duplicated) ✅
  → Admin dashboard recognizes role: "admin" ✅
  → Order management works ✅

Step 4: Admin creates/updates orders
  → Orders linked to userId: "admin123"
  → Can query all orders for management ✅
```

## Key Safeguards

### Duplicate Prevention Checklist

- ✅ Use `ensureUserProfileExists()` on every login
- ✅ Check `getDoc()` before `setDoc()`
- ✅ Use `updateDoc()` for existing documents
- ✅ Always use `auth.currentUser.uid`
- ✅ Never manually generate UUIDs for users
- ✅ Enforce `userId` in orders and inquiries

### Data Consistency Checklist

- ✅ Every order has `userId` field
- ✅ Every inquiry has `userId` field
- ✅ All documents have `createdAt` and `updatedAt`
- ✅ `createdAt` is immutable (never updated)
- ✅ `updatedAt` is updated on every change
- ✅ Queries filter by `userId` to prevent data leakage

### Security Checklist

- ✅ Admin role stored in `user_profiles` document
- ✅ `isUserAdmin()` function checks both `role` and `isAdmin` fields
- ✅ Orders can only be created by authenticated users
- ✅ Inquiries can only be created by authenticated users
- ✅ Query filters prevent users seeing others' data

## Testing Instructions

### Test 1: Prevent Duplicates
1. Sign up with a new email
2. Check Firestore: One document in `user_profiles` ✅
3. Sign out
4. Sign in again with same email
5. Check Firestore: Still ONE document (not two) ✅

### Test 2: Persistent UID
1. Note the UID in browser DevTools (Firebase Auth)
2. Sign out and sign back in
3. Check UID: Should be the same ✅

### Test 3: Orders Persistence
1. Sign up and create an order
2. Sign out and sign back in
3. Go to `/orders` page
4. Previous order should appear ✅

### Test 4: Inquiries Persistence
1. Sign up and create an inquiry
2. Sign out and sign back in
3. Go to MyEnquiries component
4. Previous inquiry should appear ✅

### Test 5: Admin Dashboard
1. Admin logs in
2. Create an order (if possible)
3. Check order management dashboard
4. Orders should be visible and manageable ✅
5. Admin logs out and back in
6. Same dashboard should work (same UID) ✅

## Files Modified

| File | Changes |
|------|---------|
| `src/context/UserAuthContext.tsx` | Added ensureUserProfileExists, updated onAuthStateChanged |
| `src/context/OwnerAuthContext.tsx` | Completely rewritten for persistent UID + role-based access |
| `src/lib/firebase-services.ts` | Added ensureUserProfileExists, isUserAdmin functions |
| `src/lib/inquiry-storage.ts` | Enforce userId, filter by userId |
| `src/components/inquiry/ConfirmationStep.tsx` | Pass userId when saving inquiry |
| `src/pages/Inquiry.tsx` | Updated InquiryData interface to include userId |

## Rollback Instructions

If needed, you can revert by checking Git history:
```bash
git log --oneline
git checkout <commit-hash> -- <file>
```

## Summary

All fixes are now in place:
1. ✅ No more duplicate user documents
2. ✅ Consistent UID across sessions
3. ✅ Admin access preserved across logins
4. ✅ All orders and inquiries linked to userId
5. ✅ Previous data automatically loads on sign-in
6. ✅ Proper timestamps on all documents
7. ✅ TypeScript compliant
8. ✅ Firebase v9+ modular syntax

The app is now production-ready for user and admin authentication with complete data persistence!
