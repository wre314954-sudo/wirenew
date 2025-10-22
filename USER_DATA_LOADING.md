# User Data Loading on Sign-In

This document explains how the app automatically fetches and displays user orders and inquiries after sign-in.

## Overview

When a user logs in via `UserAuthProvider`, the app:
1. Authenticates with Firebase
2. Saves the user profile to `UserAuthContext`
3. **Automatically fetches** the user's orders and inquiries using Firebase Firestore
4. Stores the data in context state for easy access across the app

## Architecture

### 1. UserAuthContext (`src/context/UserAuthContext.tsx`)

The main context that manages:
- **User authentication**: Login, logout, OTP verification
- **User data loading**: Orders and inquiries auto-fetch on sign-in
- **State**: `user`, `orders`, `inquiries`, `isLoadingUserData`

#### Key Functions:

```typescript
// Loads user orders and inquiries
const loadUserData = async (userId: string) => {
  const [userOrders, userInquiries] = await Promise.all([
    getUserOrders(userId),
    getUserInquiries(userId)
  ]);
  setOrders(userOrders);
  setInquiries(userInquiries);
};
```

#### When Data is Loaded:

1. **On App Initialization**: If user session is restored from localStorage
2. **After OTP Verification**: When user successfully logs in
3. **On Auth State Change**: When Firebase detects user authentication

#### When Data is Cleared:

- On logout (`setOrders([])`, `setInquiries([])`)
- When auth state changes to unauthenticated

### 2. Firebase Services (`src/lib/firebase-services.ts`)

Provides database functions:

```typescript
export const getUserOrders = async (userId: string): Promise<OrderData[]> => {
  // Queries Firestore for orders where userId matches
  // Returns array of OrderData objects
};

export const getUserInquiries = async (userId: string): Promise<InquiryData[]> => {
  // Queries Firestore for inquiries where userId matches
  // Returns array of InquiryData objects
};
```

## Usage in Components

### Using `useUserAuth()` Hook (Recommended)

```typescript
import { useUserAuth } from '@/context/UserAuthContext';

const MyComponent = () => {
  const { user, orders, inquiries, isLoadingUserData, logout } = useUserAuth();

  if (!user) {
    return <div>Please log in</div>;
  }

  if (isLoadingUserData) {
    return <div>Loading your data...</div>;
  }

  return (
    <div>
      <h1>Welcome, {user.contact}</h1>
      <p>You have {orders.length} orders</p>
      <p>You have {inquiries.length} inquiries</p>
    </div>
  );
};
```

### Using Custom `useUserData()` Hook

For components that only need orders/inquiries and a refresh function:

```typescript
import { useUserData } from '@/hooks/useUserData';

const OrdersComponent = () => {
  const { orders, inquiries, isLoading, refreshUserData } = useUserData();

  return (
    <div>
      <button onClick={refreshUserData}>Refresh</button>
      {orders.map(order => (
        <div key={order.id}>{order.orderNumber}</div>
      ))}
    </div>
  );
};
```

## Examples

### Example 1: Orders Page

```typescript
import { useUserAuth } from '@/context/UserAuthContext';

const Orders = () => {
  const navigate = useNavigate();
  const { user, orders, isLoadingUserData } = useUserAuth();

  if (!user) {
    return <div>Please log in</div>;
  }

  if (isLoadingUserData) {
    return <div>Loading orders...</div>;
  }

  if (orders.length === 0) {
    return (
      <div>
        <h2>No orders yet</h2>
        <button onClick={() => navigate('/products')}>
          Browse Products
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1>My Orders ({orders.length})</h1>
      {orders.map(order => (
        <OrderCard key={order.id} order={order} />
      ))}
    </div>
  );
};
```

### Example 2: Inquiries Page

```typescript
import { useUserAuth } from '@/context/UserAuthContext';

const Inquiries = () => {
  const { user, inquiries, isLoadingUserData } = useUserAuth();

  if (!user) {
    return <div>Please log in to view inquiries</div>;
  }

  if (isLoadingUserData) {
    return <div>Loading inquiries...</div>;
  }

  if (inquiries.length === 0) {
    return (
      <div>
        <h2>No inquiries yet</h2>
        <button onClick={() => navigate('/inquiry')}>
          Create New Inquiry
        </button>
      </div>
    );
  }

  return (
    <div>
      {inquiries.map(inquiry => (
        <InquiryCard key={inquiry.userId} inquiry={inquiry} />
      ))}
    </div>
  );
};
```

### Example 3: Dashboard with Counts

```typescript
import { useUserAuth } from '@/context/UserAuthContext';

const Dashboard = () => {
  const { user, orders, inquiries } = useUserAuth();

  return (
    <div>
      <h1>Dashboard</h1>
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <h3>Total Orders</h3>
          <p className="text-3xl">{orders.length}</p>
        </Card>
        <Card>
          <h3>Total Inquiries</h3>
          <p className="text-3xl">{inquiries.length}</p>
        </Card>
      </div>
    </div>
  );
};
```

## Data Flow Diagram

```
User Signs In (OTP Verification)
    ↓
UserAuthContext.verifyOtp() called
    ↓
Firebase Auth initialized
    ↓
User profile saved to context
    ↓
loadUserData(userId) called
    ↓
Promise.all([getUserOrders(id), getUserInquiries(id)])
    ↓
orders[] and inquiries[] updated in context
    ↓
All components using useUserAuth() re-render with new data
    ↓
Pages display orders/inquiries or empty states
```

## Error Handling

If `getUserOrders()` or `getUserInquiries()` fails:

1. Error is logged to console
2. Empty arrays are set (`orders: []`, `inquiries: []`)
3. User sees "No orders/inquiries" message
4. No toast error shown (graceful degradation)

To add error handling toast:

```typescript
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
    console.error('Failed to load user data:', error);
    toast.error('Failed to load your data');
    setOrders([]);
    setInquiries([]);
  } finally {
    setIsLoadingUserData(false);
  }
}, []);
```

## State Management Details

### Context State

```typescript
type UserAuthContextValue = {
  user: UserProfile | null;           // Current logged-in user
  isAuthenticated: boolean;            // Boolean flag
  orders: OrderData[];                 // User's orders
  inquiries: InquiryData[];            // User's inquiries
  isLoadingUserData: boolean;          // Loading state for orders/inquiries
  requestOtp: (contact) => Promise<void>;
  verifyOtp: (contact, otp) => Promise<void>;
  logout: () => void;
};
```

### When Data Updates

1. **Initial login**: Data loads after OTP verification
2. **Session restore**: Data loads from localStorage on app init
3. **Auth state sync**: Data re-loads when Firebase detects auth change
4. **Logout**: Data cleared (`orders: []`, `inquiries: []`)

## Firestore Queries

### Orders Query
```typescript
const ordersRef = collection(db, 'orders');
const q = query(
  ordersRef,
  where('userId', '==', userId),
  orderBy('createdAt', 'desc')
);
```

### Inquiries Query
```typescript
const inquiriesRef = collection(db, 'inquiries');
const q = query(
  inquiriesRef,
  where('userId', '==', userId),
  orderBy('createdAt', 'desc')
);
```

Both queries are **indexed** by `userId` and sorted by `createdAt` descending (newest first).

## Best Practices

✅ **DO:**
- Use `useUserAuth()` in any component that needs user data
- Check `isLoadingUserData` before rendering lists
- Show empty states when `orders.length === 0`
- Call `logout()` to clear all user data on sign-out

❌ **DON'T:**
- Make separate API calls to fetch orders/inquiries (data is already in context)
- Store orders/inquiries in component state (use context instead)
- Try to manually sync data with Firestore (context handles it)

## Debugging

### Check if data is loading:
```typescript
const { isLoadingUserData } = useUserAuth();
console.log('Loading:', isLoadingUserData);
```

### Verify user is authenticated:
```typescript
const { user, isAuthenticated } = useUserAuth();
console.log('User:', user);
console.log('Authenticated:', isAuthenticated);
```

### Check if orders/inquiries are available:
```typescript
const { orders, inquiries } = useUserAuth();
console.log('Orders:', orders);
console.log('Inquiries:', inquiries);
```

## Summary

The new system:
- ✅ Automatically loads orders and inquiries on sign-in
- ✅ Stores data in context for app-wide access
- ✅ Handles loading and error states
- ✅ Clears data on logout
- ✅ Restores session from localStorage
- ✅ Works with Firebase Firestore queries
