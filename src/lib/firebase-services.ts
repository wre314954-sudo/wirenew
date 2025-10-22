import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  updateDoc,
  serverTimestamp,
  Timestamp,
  deleteDoc
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { sendPasswordResetEmail as firebaseSendPasswordResetEmail } from 'firebase/auth';
import { toast } from 'sonner';

export const ADMIN_UID = 'IlrRPiSdkJdtwHpnmTk1E0Q2X3f1';

export interface UserProfileData {
  uid?: string;
  fullName?: string;
  email?: string;
  phoneNumber?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  companyName?: string;
  businessType?: string;
  gstNumber?: string;
  verified?: boolean;
  createdAt?: any;
  updatedAt?: any;
}

export interface OrderData {
  userId: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  customerCity?: string;
  customerState?: string;
  customerPincode: string;
  items: any[];
  subtotal: number;
  shippingCost?: number;
  totalAmount: number;
  paymentMethod?: string;
  paymentStatus?: string;
  qrCodeData?: string;
  transactionId?: string;
  estimatedDelivery?: string;
  notes?: string;
}

export interface InquiryData {
  userId: string;
  userType: string;
  location: string;
  productName?: string;
  productSpecification?: string;
  quantity?: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  additionalRequirements?: string;
}

export const ensureUserProfileExists = async (userId: string, profileData?: UserProfileData) => {
  try {
    const profileRef = doc(db, 'user_profiles', userId);

    // Always use merge: true to preserve existing data
    await setDoc(profileRef, {
      uid: userId,
      ...profileData,
      verified: profileData?.verified ?? false,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp()
    }, { merge: true });

    console.log(`Ensured user profile exists for userId: ${userId}`);
    return { success: true };
  } catch (error) {
    console.error('Error ensuring user profile exists:', error);
    throw error;
  }
};

export const saveUserProfile = async (userId: string, profileData: UserProfileData) => {
  try {
    const profileRef = doc(db, 'user_profiles', userId);

    await setDoc(profileRef, {
      uid: userId,
      ...profileData,
      updatedAt: serverTimestamp()
    }, { merge: true });

    return { success: true };
  } catch (error) {
    console.error('Error saving user profile:', error);
    throw error;
  }
};

export const getUserProfileData = async (userId: string) => {
  try {
    const profileRef = doc(db, 'user_profiles', userId);
    const profileSnap = await getDoc(profileRef);

    if (profileSnap.exists()) {
      return profileSnap.data() as UserProfileData;
    }
    return null;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
};

export const sendPasswordResetEmail = async (email: string) => {
  try {
    await firebaseSendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw error;
  }
};

export const getUserProfile = async (userId: string) => {
  try {
    const profileRef = doc(db, 'user_profiles', userId);
    const profileSnap = await getDoc(profileRef);

    if (profileSnap.exists()) {
      return profileSnap.data();
    }
    return null;
  } catch (error) {
    console.error('Failed to get user profile:', error);
    return null;
  }
};

export const findUserByPhoneNumber = async (phoneNumber: string): Promise<{ uid: string; email: string } | null> => {
  try {
    const profilesRef = collection(db, 'user_profiles');
    const q = query(profilesRef, where('phoneNumber', '==', phoneNumber));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return null;
    }

    const doc = querySnapshot.docs[0];
    const data = doc.data();
    return {
      uid: data.uid || doc.id,
      email: data.email
    };
  } catch (error) {
    console.error('Failed to find user by phone number:', error);
    return null;
  }
};

export const isUserAdmin = async (userId: string): Promise<boolean> => {
  try {
    const profileRef = doc(db, 'user_profiles', userId);
    const profileSnap = await getDoc(profileRef);

    if (profileSnap.exists()) {
      const data = profileSnap.data();
      return data.role === 'admin' || data.isAdmin === true;
    }
    return false;
  } catch (error) {
    console.error('Failed to check admin status:', error);
    return false;
  }
};

export const saveOrder = async (orderData: OrderData) => {
  try {
    const orderId = `order_${Date.now()}`;
    const orderRef = doc(db, 'orders', orderId);

    await setDoc(orderRef, {
      ...orderData,
      userId: orderData.userId,
      status: 'pending',
      paymentStatus: orderData.paymentStatus || 'pending',
      shippingCost: orderData.shippingCost || 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });

    return { id: orderId, ...orderData };
  } catch (error) {
    console.error('Error saving order:', error);
    throw error;
  }
};

export const getUserOrders = async (userId: string): Promise<any[]> => {
  try {
    const ordersRef = collection(db, 'orders');
    const q = query(
      ordersRef,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const orders: any[] = [];

    querySnapshot.forEach((doc) => {
      orders.push({ id: doc.id, ...doc.data() });
    });

    console.log(`Fetched ${orders.length} orders for user ${userId}`);
    return orders;
  } catch (error) {
    console.error(`Failed to get orders for user ${userId}:`, error);
    return [];
  }
};

export const updateOrderStatus = async (orderId: string, status: string, paymentStatus?: string, userId?: string) => {
  try {
    const orderRef = doc(db, 'orders', orderId);
    const updateData: any = {
      status,
      updatedAt: serverTimestamp()
    };

    if (paymentStatus) {
      updateData.paymentStatus = paymentStatus;
    }

    await updateDoc(orderRef, updateData);
    return { success: true };
  } catch (error) {
    console.error('Failed to update order status:', error);
    throw error;
  }
};

export const saveInquiry = async (inquiryData: InquiryData) => {
  try {
    const inquiryId = `inquiry_${Date.now()}`;
    const inquiryRef = doc(db, 'inquiries', inquiryId);

    await setDoc(inquiryRef, {
      ...inquiryData,
      userId: inquiryData.userId,
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });

    return { id: inquiryId, ...inquiryData };
  } catch (error) {
    console.error('Error saving inquiry:', error);
    throw error;
  }
};

export const getUserInquiries = async (userId: string): Promise<any[]> => {
  try {
    const inquiriesRef = collection(db, 'inquiries');
    const q = query(
      inquiriesRef,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const inquiries: any[] = [];

    querySnapshot.forEach((doc) => {
      inquiries.push({ id: doc.id, ...doc.data() });
    });

    console.log(`Fetched ${inquiries.length} inquiries for user ${userId}`);
    return inquiries;
  } catch (error) {
    console.error(`Failed to get inquiries for user ${userId}:`, error);
    return [];
  }
};

export const updateInquiryStatus = async (inquiryId: string, status: string) => {
  try {
    const inquiryRef = doc(db, 'inquiries', inquiryId);
    await updateDoc(inquiryRef, {
      status,
      updatedAt: serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to update inquiry status:', error);
    throw error;
  }
};

export const getAllOrders = async () => {
  try {
    const ordersRef = collection(db, 'orders');
    const q = query(ordersRef, orderBy('createdAt', 'desc'));

    const querySnapshot = await getDocs(q);
    const orders: any[] = [];

    querySnapshot.forEach((doc) => {
      orders.push({ id: doc.id, ...doc.data() });
    });

    return orders;
  } catch (error) {
    console.error('Failed to get all orders:', error);
    return [];
  }
};

export const getAllInquiries = async () => {
  try {
    const inquiriesRef = collection(db, 'inquiries');
    const q = query(inquiriesRef, orderBy('createdAt', 'desc'));

    const querySnapshot = await getDocs(q);
    const inquiries: any[] = [];

    querySnapshot.forEach((doc) => {
      inquiries.push({ id: doc.id, ...doc.data() });
    });

    return inquiries;
  } catch (error) {
    console.error('Failed to get all inquiries:', error);
    return [];
  }
};

export const getOrderStats = async () => {
  try {
    const ordersRef = collection(db, 'orders');
    const querySnapshot = await getDocs(ordersRef);

    const orders: any[] = [];
    querySnapshot.forEach((doc) => {
      orders.push(doc.data());
    });

    const totalRevenue = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
    const pendingOrders = orders.filter((o) => o.status === 'pending').length;
    const completedOrders = orders.filter((o) => o.status === 'delivered').length;

    return {
      totalOrders: orders.length,
      totalRevenue,
      pendingOrders,
      completedOrders,
    };
  } catch (error) {
    console.error('Failed to get order stats:', error);
    return {
      totalOrders: 0,
      totalRevenue: 0,
      pendingOrders: 0,
      completedOrders: 0,
    };
  }
};

export const saveProduct = async (productData: any) => {
  try {
    const productId = productData.id || `product_${Date.now()}`;
    const productRef = doc(db, 'products', productId);

    // First, get existing data to preserve fields
    const existing = await getDoc(productRef);

    await setDoc(productRef, {
      ...productData,
      updatedAt: serverTimestamp(),
      ...(existing.exists() ? {} : { createdAt: serverTimestamp() })
    }, { merge: true });

    return { id: productId, ...productData };
  } catch (error) {
    console.error('Error saving product:', error);
    throw error;
  }
};

export const getAllProducts = async () => {
  try {
    const productsRef = collection(db, 'products');
    const querySnapshot = await getDocs(productsRef);

    const products: any[] = [];
    querySnapshot.forEach((doc) => {
      products.push({ id: doc.id, ...doc.data() });
    });

    return products;
  } catch (error) {
    console.error('Failed to get all products:', error);
    return [];
  }
};

export const deleteProduct = async (productId: string) => {
  try {
    const productRef = doc(db, 'products', productId);
    await updateDoc(productRef, {
      isActive: false,
      updatedAt: serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to delete product:', error);
    throw error;
  }
};
