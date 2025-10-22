import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Package, ShoppingBag, Lock } from 'lucide-react';
import { type OrderData } from '@/lib/firebase-services';
import { format } from 'date-fns';
import { useUserAuth } from '@/context/UserAuthContext';

interface Order extends OrderData {
  id: string;
  status: string;
  paymentStatus: string;
  createdAt: string;
  estimatedDelivery?: string;
  items: Array<{
    id: string;
    productName: string;
    brand: string;
    color: string;
    quantity: number;
    unitPrice: number;
    imageUrl: string;
  }>;
}

const Orders = () => {
  const navigate = useNavigate();
  const { user, orders, isLoadingUserData } = useUserAuth();

  const typedOrders: Order[] = orders as Order[];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'default';
      case 'shipped':
      case 'processing':
        return 'secondary';
      case 'cancelled':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'failed':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-accent/10 to-background">
        <div className="container mx-auto px-4 py-8">
          <Button variant="ghost" onClick={() => navigate('/')} className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <Lock className="h-20 w-20 text-muted-foreground mb-4" />
            <h2 className="text-2xl font-bold mb-2">Please log in to view your orders</h2>
            <p className="text-muted-foreground mb-6">Use the Login / Sign Up button in the header to continue.</p>
            <Button onClick={() => navigate('/')}>Go to Home</Button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoadingUserData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-accent/10 to-background">
        <div className="container mx-auto px-4 py-8">
          <Button variant="ghost" onClick={() => navigate('/')} className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <p className="text-muted-foreground">Loading your orders...</p>
          </div>
        </div>
      </div>
    );
  }

  if (typedOrders.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-accent/10 to-background">
        <div className="container mx-auto px-4 py-8">
          <Button variant="ghost" onClick={() => navigate('/')} className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>

          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <ShoppingBag className="h-24 w-24 text-muted-foreground mb-6" />
            <h2 className="text-2xl font-bold mb-2">No orders yet</h2>
            <p className="text-muted-foreground mb-6">Start shopping to see your orders here</p>
            <Button onClick={() => navigate('/products')} className="bg-gradient-to-r from-primary to-secondary">
              Browse Products
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/10 to-background">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <Button variant="ghost" onClick={() => navigate('/')} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Button>

        <h1 className="text-3xl font-bold mb-8">My Orders</h1>

        <div className="space-y-4">
          {typedOrders.map((order) => (
            <Card key={order.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <CardHeader className="bg-accent/20">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">Order #{order.orderNumber}</CardTitle>
                    <CardDescription>
                      Placed on {format(new Date(order.createdAt), 'PPP')}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant={getPaymentStatusColor(order.paymentStatus)}>
                      {order.paymentStatus}
                    </Badge>
                    <Badge variant={getStatusColor(order.status)}>
                      {order.status}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <Package className="h-5 w-5 text-muted-foreground mt-1" />
                    <div className="flex-1 space-y-2">
                      {order.items.map((item) => (
                        <div key={item.id} className="flex gap-3">
                          <div className="w-12 h-12 flex-shrink-0 overflow-hidden rounded bg-accent/20">
                            <img
                              src={item.imageUrl}
                              alt={item.productName}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm line-clamp-1">{item.productName}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.brand} • {item.color} • Qty: {item.quantity}
                            </p>
                          </div>
                          <div className="text-sm font-medium">
                            ₹{(item.unitPrice * item.quantity).toFixed(2)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="text-sm text-muted-foreground">
                      {order.estimatedDelivery && (
                        <p>Estimated delivery: {format(new Date(order.estimatedDelivery), 'PPP')}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Total Amount</p>
                      <p className="text-xl font-bold">₹{order.totalAmount.toFixed(2)}</p>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => navigate(`/order-confirmation/${order.id}`)}
                  >
                    View Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Orders;
