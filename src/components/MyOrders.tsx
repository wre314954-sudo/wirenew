import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useUserAuth } from '@/context/UserAuthContext';
import { format } from 'date-fns';

const MyOrders: React.FC = () => {
  const { user } = useUserAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const uid = user?.id || (typeof window !== 'undefined' ? window.localStorage.getItem('userId') : null);

  useEffect(() => {
    setIsLoading(true);
    let es: EventSource | null = null;

    const load = async () => {
      try {
        const headers: any = {};
        const token = typeof window !== 'undefined' ? window.localStorage.getItem('firebase_id_token') : null;
        if (!token || !uid) {
          setOrders([]);
          return;
        }
        headers['Authorization'] = `Bearer ${token}`;
        const resp = await fetch(`/api/orders`, { headers });
        if (resp.ok) {
          const data = await resp.json();
          setOrders(Array.isArray(data) ? data : []);
        } else {
          try {
            const msg = await resp.text();
            console.error('Failed to load orders', msg);
          } catch {}
          setOrders([]);
        }
        // SSE subscription for realtime
        es = new EventSource(`/api/orders/stream?token=${encodeURIComponent(token)}`);
        es.onmessage = (ev) => {
          try {
            const next = JSON.parse(ev.data || '[]');
            if (Array.isArray(next)) setOrders(next);
          } catch {}
        };
        es.onerror = () => {};
      } catch (e) {
        console.error('Error loading orders', e);
        setOrders([]);
      } finally {
        setIsLoading(false);
      }
    };

    load();
    return () => {
      if (es) es.close();
    };
  }, [uid]);

  if (isLoading) return <p>Loading orders...</p>;

  if (!orders || orders.length === 0) {
    return <p>No previous orders</p>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Orders</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order ID</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((o) => (
              <TableRow key={o.id}>
                <TableCell>{o.orderNumber || o.id}</TableCell>
                <TableCell>{o.createdAt ? format(new Date(o.createdAt), 'PPP') : '—'}</TableCell>
                <TableCell>{Array.isArray(o.items) ? o.items.length : (o.items?.length || 0)}</TableCell>
                <TableCell>₹{(o.totalAmount ?? o.total)?.toFixed ? (o.totalAmount ?? o.total).toFixed(2) : (o.totalAmount ?? o.total)}</TableCell>
                <TableCell>{o.status || o.paymentStatus || '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default MyOrders;
