import './mocks/mock';
import { collection, addDoc, updateDoc, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Payment, Sponsorship, Wish } from "@/types/models";
import { processNotchPayPayment, verifyNotchPayPayment, PaymentRequest } from "@/services/payment-gateway";
import { toast } from "@/components/ui/sonner";
import { useToast } from "@/hooks/use-toast";

// Create a toast function that matches the expected API
const showToast = (message: string, options?: { variant?: "default" | "destructive" }) => {
  if (options?.variant === "destructive") {
    toast(message, {
      style: { backgroundColor: 'red', color: 'white' }
    });
  } else {
    toast(message);
  }
};

export const makePayment = async (paymentData: Omit<Payment, 'id' | 'status' | 'createdAt' | 'transactionId'>) => {
  try {
    // Prepare payment request for NotchPay
    const paymentRequest: PaymentRequest = {
      amount: paymentData.amount,
      currency: paymentData.currency || "XAF", // Default to XAF (CFA)
      reference: `payment_${Date.now()}`,
      description: paymentData.purpose,
      customerName: paymentData.donorName,
      customerEmail: paymentData.donorId, // Assuming donorId could be the email, adjust as needed
      redirectUrl: `${window.location.origin}/donor/payment-success`
    };

    // Process payment with NotchPay
    const paymentResponse = await processNotchPayPayment(paymentRequest);
    
    if (!paymentResponse.success) {
      throw new Error(paymentResponse.message || "Payment processing failed");
    }
    
    // Create a new payment record in Firestore
    const paymentCollection = collection(db, "payments");
    const newPayment = {
      amount: paymentData.amount,
      currency: paymentData.currency || "XAF",
      date: paymentData.date || new Date().toISOString(),
      donorId: paymentData.donorId,
      donorName: paymentData.donorName,
      orphanageId: paymentData.orphanageId,
      childId: paymentData.childId,
      childName: paymentData.childName,
      purpose: paymentData.purpose,
      status: "pending", // Initially set as pending until confirmation
      transactionId: paymentResponse.transactionId,
      paymentUrl: paymentResponse.paymentUrl, // Store the payment URL if needed
      createdAt: Date.now()
    };
    
    const docRef = await addDoc(paymentCollection, newPayment);
    const paymentId = docRef.id;
    
    // If payment was successful, update child's wish status if applicable
    if (paymentData.childId) {
      // Find wishes for this child
      const wishesCollection = collection(db, "wishes");
      const q = query(
        wishesCollection, 
        where("childId", "==", paymentData.childId),
        where("status", "==", "pending")
      );
      
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        // Update the first pending wish
        const wishDoc = snapshot.docs[0];
        await updateDoc(doc(db, "wishes", wishDoc.id), {
          status: "in-progress",
          donorId: paymentData.donorId,
          donorName: paymentData.donorName,
          updatedAt: Date.now()
        });
      }
    }
    
    // Return the payment data with ID and NotchPay payment URL
    return { 
      id: paymentId, 
      ...newPayment, 
      paymentUrl: paymentResponse.paymentUrl 
    };
  } catch (error) {
    console.error("Error processing payment:", error);
    showToast(error instanceof Error ? error.message : "An error occurred processing your payment", { variant: "destructive" });
    throw error;
  }
};

// Function to handle payment confirmation
export const confirmPayment = async (paymentId: string, transactionId: string): Promise<boolean> => {
  try {
    // Verify payment with NotchPay
    const isVerified = await verifyNotchPayPayment(transactionId);
    
    if (isVerified) {
      // Update payment status in Firestore
      const paymentRef = doc(db, "payments", paymentId);
      await updateDoc(paymentRef, {
        status: "successful",
        updatedAt: Date.now()
      });
      
      toast("Your payment has been processed successfully.");
      
      return true;
    } else {
      // If verification failed, update status to failed
      const paymentRef = doc(db, "payments", paymentId);
      await updateDoc(paymentRef, {
        status: "failed",
        updatedAt: Date.now()
      });
      
      showToast("Your payment could not be verified. Please try again.", { variant: "destructive" });
      
      return false;
    }
  } catch (error) {
    console.error("Error confirming payment:", error);
    return false;
  }
};

export const getPaymentsByDonor = async (donorId: string) => {
  try {
    const paymentCollection = collection(db, "payments");
    const q = query(paymentCollection, where("donorId", "==", donorId));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment));
  } catch (error) {
    console.error("Error getting payments:", error);
    throw error;
  }
};

export const createSponsorship = async (sponsorshipData: Omit<Sponsorship, 'id' | 'createdAt'>) => {
  try {
    const sponsorshipCollection = collection(db, "sponsorships");
    const newSponsorship = {
      ...sponsorshipData,
      createdAt: Date.now()
    };
    
    const docRef = await addDoc(sponsorshipCollection, newSponsorship);
    return { id: docRef.id, ...newSponsorship } as Sponsorship;
  } catch (error) {
    console.error("Error creating sponsorship:", error);
    throw error;
  }
};

export const getSponsorshipsByDonor = async (donorId: string) => {
  try {
    const sponsorshipCollection = collection(db, "sponsorships");
    const q = query(sponsorshipCollection, where("donorId", "==", donorId));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Sponsorship));
  } catch (error) {
    console.error("Error getting sponsorships:", error);
    throw error;
  }
};

export const fulfillWish = async (wishId: string, donorId: string, donorName: string) => {
  try {
    const wishRef = doc(db, "wishes", wishId);
    const wishDoc = await getDoc(wishRef);
    
    if (!wishDoc.exists()) {
      throw new Error("Wish not found");
    }
    
    const wishData = wishDoc.data() as Wish;
    
    // Update the wish status
    await updateDoc(wishRef, {
      status: "fulfilled",
      donorId,
      donorName,
      completionDate: new Date().toISOString(),
      updatedAt: Date.now()
    });
    
    // Create a record of this fulfillment
    const paymentCollection = collection(db, "payments");
    const newPayment = {
      amount: 0, // This is an in-kind donation
      currency: "USD",
      date: new Date().toISOString(),
      donorId,
      donorName,
      orphanageId: wishData.orphanageId,
      childId: wishData.childId,
      childName: wishData.childName,
      purpose: `Fulfilled wish: ${wishData.item}`,
      status: "successful",
      transactionId: `wish_${wishId}`,
      createdAt: Date.now()
    };
    
    await addDoc(paymentCollection, newPayment);
    
    return true;
  } catch (error) {
    console.error("Error fulfilling wish:", error);
    throw error;
  }
};





