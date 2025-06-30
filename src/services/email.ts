import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

/**
 * Send email verification for payment
 * This would typically use an email service like SendGrid, Mailgun, etc.
 * For now, we'll just log the email to Firestore for demonstration
 */
export const sendEmailVerification = async (
  email: string,
  name: string,
  verificationCode: string,
  amount: number,
  currency: string
): Promise<boolean> => {
  try {
    // In a real implementation, this would call an email API
    // For now, we'll just log the email to Firestore
    await addDoc(collection(db, "emailLogs"), {
      to: email,
      subject: "Verify Your Payment - HopeBridge Connect",
      template: "payment-verification",
      data: {
        name,
        verificationCode,
        amount,
        currency,
      },
      sentAt: serverTimestamp(),
      status: "pending", // Mark as pending for Cloud Function
    });
    
    return true;
  } catch (error) {
    console.error("Error logging email verification:", error);
    return false;
  }
};

/**
 * Send volunteer application approval email
 */
export const sendVolunteerApprovalEmail = async (
  email: string,
  name: string,
  orphanageName: string
): Promise<boolean> => {
  try {
    const signInLink = `${window.location.origin}/signin`;
    await addDoc(collection(db, "emailLogs"), {
      to: email,
      subject: "Your Volunteer Application Has Been Approved - HopeBridge Connect",
      template: "volunteer-approval",
      data: {
        name,
        orphanageName,
        signInLink,
      },
      sentAt: serverTimestamp(),
      status: "pending", // Mark as pending for Cloud Function
    });
    return true;
  } catch (error) {
    console.error("Error logging volunteer approval email:", error);
    return false;
  }
};

/**
 * Send volunteer application rejection email
 */
export const sendVolunteerRejectionEmail = async (
  email: string,
  name: string,
  orphanageName: string,
  reason: string
): Promise<boolean> => {
  try {
    await addDoc(collection(db, "emailLogs"), {
      to: email,
      subject: "Update on Your Volunteer Application - HopeBridge Connect",
      template: "volunteer-rejection",
      data: {
        name,
        orphanageName,
        reason,
      },
      sentAt: serverTimestamp(),
      status: "pending", // Mark as pending for Cloud Function
    });
    return true;
  } catch (error) {
    console.error("Error logging volunteer rejection email:", error);
    return false;
  }
};

/**
 * Validate email format and domain
 */
export const validateEmail = (email: string): boolean => {
  // Basic format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return false;
  }
  
  // Check for disposable email domains (basic implementation)
  const disposableDomains = [
    'tempmail.com', 'throwawaymail.com', 'mailinator.com', 
    'guerrillamail.com', 'yopmail.com', 'sharklasers.com'
  ];
  
  const domain = email.split('@')[1].toLowerCase();
  if (disposableDomains.includes(domain)) {
    return false;
  }
  
  return true;
};

/**
 * Send payment confirmation email
 */
// Replaced with direct Resend API email sending. See email-payment-resend.ts for new implementation.
// export const sendPaymentConfirmation = async (
//   email: string,
//   name: string,
//   amount: number,
//   currency: string,
//   transactionId: string,
//   type: string
// ): Promise<boolean> => {
//   try {
//     await addDoc(collection(db, "emailLogs"), {
//       to: email,
//       subject: `Payment Confirmation - HopeBridge Connect`,
//       template: "payment-confirmation",
//       data: {
//         name,
//         amount,
//         currency,
//         transactionId,
//         type,
//         date: new Date().toISOString(),
//       },
//       sentAt: serverTimestamp(),
//       status: "pending", // Mark as pending for Cloud Function
//     });
//     return true;
//   } catch (error) {
//     console.error("Error logging payment confirmation email:", error);
//     return false;
//   }
// };

/**
 * Send email verification for user registration
 */
export const sendUserVerificationEmail = async (
  email: string,
  name: string,
  verificationLink: string
): Promise<boolean> => {
  try {
    await addDoc(collection(db, "emailLogs"), {
      to: email,
      subject: "Verify Your Account - HopeBridge Connect",
      template: "user-verification",
      data: {
        name,
        verificationLink,
      },
      sentAt: serverTimestamp(),
      status: "pending", // Mark as pending for Cloud Function
    });
    return true;
  } catch (error) {
    console.error("Error logging user verification email:", error);
    return false;
  }
};

/**
 * Send notification for new chat message
 */
export const sendChatNotificationEmail = async (
  email: string,
  name: string,
  senderName: string,
  messagePreview: string
): Promise<boolean> => {
  try {
    await addDoc(collection(db, "emailLogs"), {
      to: email,
      subject: "New Message from " + senderName + " - HopeBridge Connect",
      template: "chat-notification",
      data: {
        name,
        senderName,
        messagePreview,
        loginLink: `${window.location.origin}/signin`,
      },
      sentAt: serverTimestamp(),
      status: "pending", // Mark as pending for Cloud Function
    });
    return true;
  } catch (error) {
    console.error("Error logging chat notification email:", error);
    return false;
  }
};



