
import { useState, useEffect } from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Search, Download, Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { collection, query, getDocs, orderBy, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

// Define Payment interface
interface Payment {
  id: string;
  donorName: string;
  donorEmail: string;
  amount: number;
  date: string;
  status: "successful" | "pending" | "failed" | "completed";
  paymentType: "monetary" | "in-kind";
  purpose: string;
  note?: string;
  orphanageId: string;
  donorId: string;
  transactionId: string;
  createdAt: number;
}

const AdminPayments = () => {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Format date
  const formatDate = (timestamp: number) => {
    return format(new Date(timestamp), 'MMM dd, yyyy');
  };

  // Export payments as CSV
  const exportPayments = () => {
    if (payments.length === 0) return;

    const headers = ["Date", "Donor Name", "Amount"];
    const csvData = payments.map(payment => [
      formatDate(payment.createdAt),
      payment.donorName || "Anonymous",
      payment.amount.toString()
    ]);

    const csvContent = [
      headers.join(","),
      ...csvData.map(row => row.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `payment_history_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Fetch payments data
  useEffect(() => {
    const fetchPayments = async () => {
      if (!userProfile?.orphanageId) {
        setLoading(false);
        setError("No orphanage associated with this account");
        return;
      }
      
      try {
        setLoading(true);
        setError(null);
        
        console.log("Fetching payments for orphanage:", userProfile.orphanageId);
        
        // Create a query against the payments collection
        const paymentsRef = collection(db, "payments");
        
        // Note: This query requires a composite index in Firebase
        // If you get an error, follow the link in the error message to create the index
        const q = query(
          paymentsRef,
          where("orphanageId", "==", userProfile.orphanageId)
        );
        
        const querySnapshot = await getDocs(q);
        const paymentsData: Payment[] = [];
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          paymentsData.push({ 
            id: doc.id, 
            ...data,
            // Ensure all required fields have default values
            donorName: data.donorName || "Anonymous",
            donorEmail: data.donorEmail || "",
            amount: data.amount || 0,
            date: data.date || "",
            status: data.status || "pending",
            paymentType: data.paymentType || "monetary",
            purpose: data.purpose || "",
            orphanageId: data.orphanageId || "",
            donorId: data.donorId || "",
            transactionId: data.transactionId || "",
            createdAt: data.createdAt || Date.now()
          } as Payment);
        });
        
        // Sort by createdAt (most recent first)
        paymentsData.sort((a, b) => b.createdAt - a.createdAt);
        
        setPayments(paymentsData);
        console.log("Fetched payments:", paymentsData.length);
      } catch (error) {
        console.error("Error fetching payments:", error);
        setError("Failed to load payment history");
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load payment history. Please create the required index in Firebase.",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, [userProfile, toast]);

  const filteredPayments = payments.filter(payment => {
    // Filter by search query
    const matchesSearch = 
      (payment.donorName?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
      (payment.donorEmail?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
      (payment.purpose?.toLowerCase() || "").includes(searchQuery.toLowerCase());
    
    // Filter by status
    const matchesStatus = statusFilter === "all" || payment.status === statusFilter;
    
    // Filter by payment type
    const matchesType = typeFilter === "all" || payment.paymentType === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Payment History</h1>
        <Button variant="outline" onClick={exportPayments} disabled={payments.length === 0}>
          <Download className="mr-2 h-4 w-4" /> Export Report
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-end">
        <div className="w-full sm:w-1/3 relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search donors..."
            className="pl-10"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="w-full sm:w-1/3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="completed">Successful</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="w-full sm:w-1/3">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="monetary">Monetary</SelectItem>
              <SelectItem value="in-kind">In-Kind</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <p className="text-red-500 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </CardContent>
        </Card>
      ) : payments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <p className="text-muted-foreground mb-4">No payment history available</p>
          </CardContent>
        </Card>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Donor Name</TableHead>
                <TableHead>Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8">
                    No payments match your search criteria
                  </TableCell>
                </TableRow>
              ) : (
                filteredPayments.map(payment => (
                  <TableRow key={payment.id}>
                    <TableCell>{formatDate(payment.createdAt)}</TableCell>
                    <TableCell>{payment.donorName || "Anonymous"}</TableCell>
                    <TableCell>{formatCurrency(payment.amount)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default AdminPayments;






