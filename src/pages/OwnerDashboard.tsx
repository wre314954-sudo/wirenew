import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { ArrowLeft, CalendarClock, LogOut, RefreshCw, Users, ShoppingBag, Package } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { useOwnerAuth } from "@/context/OwnerAuthContext";
import { OrdersManagement } from "@/components/dashboard/OrdersManagement";
import { ProductsManagement } from "@/components/dashboard/ProductsManagement";
import { removeInquiryFromStorage } from "@/lib/inquiry-storage";
import { ADMIN_UID } from "@/lib/firebase-services";

const OwnerDashboard = () => {
  const navigate = useNavigate();
  const { isAuthenticated, logout, userId, isAdmin } = useOwnerAuth();
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [tokenReady, setTokenReady] = useState(false);

  const loadInquiries = async (token?: string) => {
    setIsLoading(true);
    try {
      const authToken = token || (typeof window !== 'undefined' ? window.localStorage.getItem('firebase_id_token') : null);
      if (!authToken) {
        setInquiries([]);
        return;
      }

      const headers: any = { 'Authorization': `Bearer ${authToken}` };
      const resp = await fetch('/api/admin/enquiries', { headers });
      if (!resp.ok) {
        let msg = `${resp.status} ${resp.statusText}`;
        try { msg = await resp.text(); } catch {}
        throw new Error(msg);
      }
      const data = await resp.json();
      setInquiries(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading enquiries:', error);
      toast.error('Failed to load enquiries');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const token = typeof window !== 'undefined' ? window.localStorage.getItem('firebase_id_token') : null;
    setTokenReady(!!token);
  }, []);

  useEffect(() => {
    if (!tokenReady) return;

    let es: EventSource | null = null;
    let isMounted = true;

    (async () => {
      const token = typeof window !== 'undefined' ? window.localStorage.getItem('firebase_id_token') : null;
      if (!token) return;

      await loadInquiries(token);
      if (!isMounted) return;

      try {
        es = new EventSource(`/api/admin/enquiries/stream?token=${encodeURIComponent(token)}`);
        es.onmessage = (ev) => {
          if (!isMounted) return;
          try {
            const next = JSON.parse(ev.data || '[]');
            if (Array.isArray(next)) setInquiries(next);
          } catch {}
        };
        es.onerror = (error) => {
          if (!isMounted) return;
          if (error && (error.type === 'error' || error.message?.includes('abort'))) {
            return;
          }
          console.error('Enquiries stream error:', error);
        };
      } catch (e) {
        if (!isMounted) return;
        console.error('Failed to setup enquiries stream:', e);
      }
    })();

    return () => {
      isMounted = false;
      if (es) {
        es.close();
      }
    };
  }, [tokenReady]);

  if (!isAuthenticated || !isAdmin || userId !== ADMIN_UID) {
    return <Navigate to="/owner/login" replace />;
  }

  const stats = useMemo(() => {
    if (inquiries.length === 0) {
      return {
        total: 0,
        verified: 0,
        distinctUserTypes: 0,
        lastCreatedAt: null as Date | null,
      };
    }

    const verified = inquiries.filter((inquiry) => inquiry.verified).length;
    const userTypes = new Set(inquiries.map((inquiry) => inquiry.userType));
    const sorted = [...inquiries].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return {
      total: inquiries.length,
      verified,
      distinctUserTypes: userTypes.size,
      lastCreatedAt: new Date(sorted[0]?.createdAt ?? Date.now()),
    };
  }, [inquiries]);

  const refreshInquiries = async () => {
    await loadInquiries();
    toast.success("Enquiries refreshed");
  };

  const handleEnquiryStatusUpdate = async (enquiryId: string, newStatus: string) => {
    try {
      const token = typeof window !== 'undefined' ? window.localStorage.getItem('firebase_id_token') : null;
      if (!token) {
        toast.error('Authentication required');
        return;
      }

      const headers: any = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
      const resp = await fetch(`/api/admin/enquiries/${encodeURIComponent(enquiryId)}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status: newStatus })
      });
      if (!resp.ok) throw new Error('Failed');
      toast.success('Enquiry status updated');
    } catch (error) {
      toast.error('Failed to update enquiry status');
    }
  };

  const handleRemove = (id: string) => {
    removeInquiryFromStorage(id);
    setInquiries((prev) => prev.filter((inquiry) => inquiry.id !== id));
    toast.success("Inquiry removed");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/10 to-background py-8 px-4">
      <div className="container mx-auto max-w-6xl space-y-8">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              Owner Portal
            </div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">
              Manage orders, track inquiries, and monitor business performance.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="ghost" onClick={() => navigate("/")} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Home
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                logout();
                navigate("/owner/login", { replace: true });
              }}
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </header>

        <Tabs defaultValue="products" className="space-y-6">
          <TabsList>
            <TabsTrigger value="products" className="gap-2">
              <Package className="h-4 w-4" />
              Products
            </TabsTrigger>
            <TabsTrigger value="orders" className="gap-2">
              <ShoppingBag className="h-4 w-4" />
              Orders
            </TabsTrigger>
            <TabsTrigger value="inquiries" className="gap-2">
              <Users className="h-4 w-4" />
              Inquiries
            </TabsTrigger>
          </TabsList>

          <TabsContent value="products">
            <ProductsManagement />
          </TabsContent>

          <TabsContent value="orders">
            <OrdersManagement />
          </TabsContent>

          <TabsContent value="inquiries" className="space-y-6">
            <section className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardDescription>Total enquiries</CardDescription>
                  <CardTitle className="text-4xl">{stats.total}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {stats.total === 0 ? "No enquiries yet" : "All customer submissions received"}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardDescription>Verified contacts</CardDescription>
                  <CardTitle className="text-4xl">{stats.verified}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {stats.verified === 0
                      ? "Awaiting verification"
                      : `${stats.verified} contact${stats.verified === 1 ? "" : "s"} confirmed by OTP`}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardDescription>Last enquiry</CardDescription>
                  <CardTitle className="text-3xl">
                    {stats.lastCreatedAt
                      ? formatDistanceToNow(stats.lastCreatedAt, { addSuffix: true })
                      : "—"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CalendarClock className="h-4 w-4" />
                  {stats.lastCreatedAt ? format(stats.lastCreatedAt, "PPP p") : "Waiting for first entry"}
                </CardContent>
              </Card>
            </section>

            <section className="flex justify-end gap-2">
              <Button variant="outline" onClick={refreshInquiries} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
            </section>

            <section>
              <Card>
                <CardHeader>
                  <CardTitle>Enquiry details</CardTitle>
                  <CardDescription>Track each submission and follow up promptly.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
              {inquiries.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                  <Users className="h-10 w-10 text-muted-foreground" />
                  <div>
                    <h2 className="text-lg font-semibold">No enquiries yet</h2>
                    <p className="text-sm text-muted-foreground">
                      Encourage customers to submit the enquiry form to see them listed here.
                    </p>
                  </div>
                  <Button onClick={() => navigate("/inquiry")} className="gap-2">
                    Go to Inquiry Form
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex gap-2 text-sm text-muted-foreground">
                    <Badge variant="secondary" className="uppercase tracking-wide">
                      {stats.distinctUserTypes} user type{stats.distinctUserTypes === 1 ? "" : "s"}
                    </Badge>
                    <Badge variant="outline" className="uppercase tracking-wide">
                      {inquiries.length} total entr{inquiries.length === 1 ? "y" : "ies"}
                    </Badge>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>Submitted</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {inquiries.map((inquiry) => (
                        <TableRow key={inquiry.id}>
                          <TableCell>
                            <div className="space-y-1">
                              <p className="font-medium capitalize">{inquiry.name || "Unknown"}</p>
                              <Badge variant="outline" className="w-fit capitalize">
                                {inquiry.userType}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1 text-sm">
                              <p>{inquiry.phone}</p>
                              <p className="text-muted-foreground">{inquiry.email}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1 text-sm">
                              <p>{inquiry.address}</p>
                              <p className="text-muted-foreground">PIN: {inquiry.pincode}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1 text-sm">
                              <p className="capitalize">Brand: {inquiry.brand}</p>
                              <p className="capitalize">Colour: {inquiry.color}</p>
                              <p>
                                Quantity: {inquiry.quantity} {inquiry.unit}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(inquiry.createdAt), { addSuffix: true })}
                          </TableCell>
                          <TableCell className="text-right">
                            <Select value={inquiry.status || 'pending'} onValueChange={(v) => handleEnquiryStatusUpdate(inquiry.id, v)}>
                              <SelectTrigger className="w-32">
                                <Badge variant="outline" className="w-full justify-center">{inquiry.status || 'pending'}</Badge>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="in_progress">In Progress</SelectItem>
                                <SelectItem value="responded">Responded</SelectItem>
                                <SelectItem value="closed">Closed</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </section>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default OwnerDashboard;
