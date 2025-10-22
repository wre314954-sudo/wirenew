import { useCallback } from 'react';
import { useUserAuth } from '@/context/UserAuthContext';
import { getUserOrders, getUserInquiries } from '@/lib/firebase-services';
import { toast } from 'sonner';

export interface UseUserDataResult {
  orders: any[];
  inquiries: any[];
  isLoading: boolean;
  refreshUserData: () => Promise<void>;
}

export const useUserData = (): UseUserDataResult => {
  const { user, orders, inquiries, isLoadingUserData } = useUserAuth();

  const refreshUserData = useCallback(async () => {
    if (!user?.id) {
      toast.error('No user logged in');
      return;
    }

    try {
      const [userOrders, userInquiries] = await Promise.all([
        getUserOrders(user.id),
        getUserInquiries(user.id),
      ]);

      toast.success('Data refreshed successfully');
    } catch (error) {
      console.error('Failed to refresh user data:', error);
      toast.error('Failed to refresh data. Please try again.');
    }
  }, [user]);

  return {
    orders,
    inquiries,
    isLoading: isLoadingUserData,
    refreshUserData,
  };
};
