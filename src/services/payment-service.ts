import { collection, addDoc, updateDoc, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "@/components/ui/sonner";

interface PaymentData {
  amount: number;
  currency: string;
  date: string;
  donorId: string;
  donorName: string;
  orphanageId: string;
  childId?: string;
  childName?: string;
  purpose: string;
  [key: string]: any;
}

interface PaymentResponse {
  success: boolean;
  paymentId?: string;
  message?: string;
}

// Create a payment record
export const createPayment = async (paymentData: PaymentData): Promise<PaymentResponse> => {
  try {
    const paymentRef = await addDoc(collection(db, "payments"), {
      ...paymentData,
      status: "pending",
      createdAt: Date.now()
    });
    
    return {
      success: true,
      paymentId: paymentRef.id
    };
  } catch (error) {
    console.error("Error creating payment:", error);
    toast(
      `Payment Error: ${error instanceof Error ? error.message : "Payment creation failed"}`
    );
    
    return {
      success: false,
      message: error instanceof Error ? error.message : "Payment creation failed"
    };
  }
};

// Get payment by ID
export const getPaymentById = async (paymentId: string) => {
  try {
    const paymentDoc = await getDoc(doc(db, "payments", paymentId));
    
    if (!paymentDoc.exists()) {
      throw new Error("Payment not found");
    }
    
    return {
      id: paymentDoc.id,
      ...paymentDoc.data()
    };
  } catch (error) {
    console.error("Error fetching payment:", error);
    throw error;
  }
};

// Update payment status
export const updatePaymentStatus = async (paymentId: string, status: string): Promise<PaymentResponse> => {
  try {
    await updateDoc(doc(db, "payments", paymentId), {
      status,
      updatedAt: Date.now()
    });
    
    return {
      success: true
    };
  } catch (error) {
    console.error("Error updating payment status:", error);
    throw error;
  }
};

// Free/test payment (in-app, no gateway)
export const makeFreePayment = async (paymentData: PaymentData): Promise<PaymentResponse> => {
  try {
    const paymentRef = await addDoc(collection(db, "payments"), {
      ...paymentData,
      status: "succesful",
      createdAt: Date.now(),
      gatewayResponse: { type: "free", message: "Free/test payment" }
    });
    return {
      success: true,
      paymentId: paymentRef.id,
      message: "Free payment successful"
    };
  } catch (error) {
    console.error("Error creating free payment:", error);
    toast(
      `Free Payment Error: ${error instanceof Error ? error.message : "Free payment creation failed"}`
    );
    return {
      success: false,
      message: error instanceof Error ? error.message : "Free payment creation failed"
    };
  }
};



