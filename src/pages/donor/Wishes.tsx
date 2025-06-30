import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import axios from "axios";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

const MONEROO_API_KEY = "pvk_sandbox_2v25fv|01JYS2QB8Q6CD0BKJKX69QHDQD";

const Wishes = () => {
  const navigate = useNavigate();
  const { currentUser, userProfile } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [wishes, setWishes] = useState<any[]>([]);
  const [loadingWishes, setLoadingWishes] = useState(true);

  useEffect(() => {
    const fetchWishes = async () => {
      setLoadingWishes(true);
      try {
        // Fetch only wishes with status 'pending' (or adjust as needed)
        const wishesQuery = query(
          collection(db, "wishes"),
          where("status", "==", "pending")
        );
        const snapshot = await getDocs(wishesQuery);
        const wishList = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setWishes(wishList);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to load wishes.",
          variant: "destructive",
        });
      } finally {
        setLoadingWishes(false);
      }
    };
    fetchWishes();
  }, [toast]);

  const handlePay = async (wish: any) => {
    if (!currentUser || !userProfile) {
      toast({
        title: "Error",
        description: "You must be logged in to make a payment",
        variant: "destructive",
      });
      return;
    }
    setIsLoading(true);
    try {
      // Call Moneroo API to get payment URL
      const response = await axios.post(
        "https://api.moneroo.com/v1/payments/initiate", // Replace with actual Moneroo endpoint
        {
          amount: wish.amount || wish.quantity || 0,
          api_key: MONEROO_API_KEY,
          phone: currentUser.phoneNumber || "",
          currency: "XAF",
          reference: `wish_${wish.id}_${Date.now()}`,
          description: `Wish: ${wish.item}`,
          // Add more fields as required by Moneroo
        }
      );
      const paymentUrl = response.data.payment_url || response.data.redirect_url;
      if (!paymentUrl) throw new Error("Failed to get payment URL from Moneroo");

      // Save payment record to Firebase
      const paymentData = {
        amount: wish.amount || wish.quantity || 0,
        currency: "XAF",
        date: new Date().toISOString(),
        donorId: currentUser.uid,
        donorName: userProfile.displayName || "Anonymous",
        orphanageId: wish.orphanageId || "",
        childId: wish.childId || wish.id,
        childName: wish.childName,
        purpose: `Wish: ${wish.item}`,
        status: "pending",
        transactionId: response.data.reference || `wish_${wish.id}_${Date.now()}`,
        createdAt: Date.now(),
        paymentUrl,
        gatewayResponse: response.data,
      };
      await import("firebase/firestore").then(({ addDoc, collection }) =>
        addDoc(collection(db, "payments"), paymentData)
      );
      window.location.href = paymentUrl;
    } catch (error: any) {
      toast({
        title: "Payment Error",
        description:
          error?.response?.data?.message || error.message || "Failed to process payment.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>All Wishes</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingWishes ? (
            <div className="mb-4">Loading wishes...</div>
          ) : wishes.length === 0 ? (
            <div className="mb-4">No wishes available at the moment.</div>
          ) : (
            <div className="mb-4">
              {wishes.map((wish) => (
                <div
                  key={wish.id}
                  className="flex items-center justify-between border-b py-2"
                >
                  <span>
                    {wish.childName} - {wish.item} ({wish.amount || wish.quantity || 0} XAF)
                  </span>
                  <Button onClick={() => handlePay(wish)} disabled={isLoading}>
                    {isLoading ? "Processing..." : "Pay by Mobile Money"}
                  </Button>
                </div>
              ))}
            </div>
          )}
          <Button
            onClick={() => navigate("/donor/dashboard")}
            className="mt-4"
          >
            Back to Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Wishes;
