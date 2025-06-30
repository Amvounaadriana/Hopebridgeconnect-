import { db } from "@/lib/firebase";
import { collection, addDoc, setDoc, serverTimestamp, doc, updateDoc, getDoc } from "firebase/firestore";
import { sendEmailVerification } from "./email";
import { sendPaymentConfirmation } from "./email-payment-resend";

export interface PaymentRequest {
  amount: number;
  currency: string;
  reference: string;
  description: string;
  customerName: string;
  customerEmail: string;
  redirectUrl: string;
}

export interface PaymentResponse {
  success: boolean;
  transactionId?: string;
  message: string;
  paymentUrl?: string;
}

/**
 * Process payment through NotchPay payment gateway
 */
export const processNotchPayPayment = async (paymentRequest: PaymentRequest): Promise<PaymentResponse> => {
  try {
    // In a real implementation, this would call the NotchPay API
    // For now, we'll simulate a successful payment initiation

    // Create a transaction record in Firestore with the custom reference as the document ID
    const transactionData = {
      amount: paymentRequest.amount,
      currency: paymentRequest.currency,
      reference: paymentRequest.reference,
      description: paymentRequest.description,
      customerName: paymentRequest.customerName,
      customerEmail: paymentRequest.customerEmail,
      status: "pending",
      createdAt: serverTimestamp(),
    };

    // Use setDoc to set the document ID to the custom reference
    const transactionRef = doc(collection(db, "transactions"), paymentRequest.reference);
    await setDoc(transactionRef, transactionData);

    // Generate a payment URL that would normally come from NotchPay
    // In production, this would be the URL returned by the NotchPay API
    const paymentUrl = paymentRequest.redirectUrl.includes('?') 
      ? `${paymentRequest.redirectUrl}&transactionId=${transactionRef.id}`
      : `${paymentRequest.redirectUrl}?transactionId=${transactionRef.id}`;

    // Send email notification for payment initiation
    if (paymentRequest.customerEmail) {
      try {
        await sendEmailVerification(
          paymentRequest.customerEmail,
          paymentRequest.customerName,
          transactionRef.id.substring(0, 6),
          paymentRequest.amount,
          paymentRequest.currency
        );
      } catch (emailError) {
        console.error("Failed to send email verification:", emailError);
        // Continue with payment process even if email fails
      }
    }

    return {
      success: true,
      transactionId: transactionRef.id,
      message: "Payment initiated successfully",
      paymentUrl: paymentUrl
    };
  } catch (error: any) {
    console.error("Payment gateway error:", error);
    return {
      success: false,
      message: error.message || "Payment processing failed"
    };
  }
};

/**
 * Verify payment with NotchPay
 */
export const verifyNotchPayPayment = async (transactionId: string): Promise<boolean> => {
  try {
    // In a real implementation, this would call the NotchPay API to verify the payment
    // For now, we'll simulate a successful verification
    
    // Get the transaction from Firestore
    const transactionRef = doc(db, "transactions", transactionId);
    const transactionSnap = await getDoc(transactionRef);
    
    if (!transactionSnap.exists()) {
      console.error("Transaction not found:", transactionId);
      return false;
    }
    
    const transactionData = transactionSnap.data();
    
    // Update the transaction status
    await updateDoc(transactionRef, {
      status: "completed",
      verifiedAt: serverTimestamp()
    });
    
    // Send payment confirmation email
    if (transactionData.customerEmail) {
      try {
        await sendPaymentConfirmation(
          transactionData.customerEmail,
          transactionData.customerName,
          transactionData.amount,
          transactionData.currency,
          transactionId,
          transactionData.description.toLowerCase().includes("sponsorship") ? "sponsorship" : "donation"
        );
      } catch (emailError) {
        console.error("Failed to send payment confirmation email:", emailError);
        // Continue with payment verification even if email fails
      }
    }
    
    return true;
  } catch (error) {
    console.error("Payment verification error:", error);
    return false;
  }
};





