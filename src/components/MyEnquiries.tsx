import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useUserAuth } from '@/context/UserAuthContext';
import { formatDistanceToNow } from 'date-fns';

const MyEnquiries: React.FC = () => {
  const { user, inquiries, isLoadingUserData } = useUserAuth();

  if (!user) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <p className="text-muted-foreground">Please log in to view your enquiries.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoadingUserData) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <p className="text-muted-foreground">Loading your enquiries...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (inquiries.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <p className="text-muted-foreground">No enquiries found. Submit your first enquiry to get started.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Enquiries</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Enquiry ID</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {inquiries.map((inquiry) => (
              <TableRow key={inquiry.userId ? `${inquiry.userId}-${inquiry.createdAt}` : Math.random()}>
                <TableCell className="font-mono text-sm">{inquiry.userId?.slice(0, 8) || '—'}</TableCell>
                <TableCell>{inquiry.productName || inquiry.userType || inquiry.location || '—'}</TableCell>
                <TableCell>
                  {inquiry.createdAt
                    ? formatDistanceToNow(new Date(inquiry.createdAt), { addSuffix: true })
                    : '—'}
                </TableCell>
                <TableCell>Pending</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default MyEnquiries;
