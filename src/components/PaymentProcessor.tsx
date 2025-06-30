
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, WalletCards } from "lucide-react";
import { makePayment, confirmPayment } from "@/services/donor-service";
import { Payment } from "@/types/models";
import { useToast } from "@/hooks/use-toast";

interface PaymentProcessorProps {
  amount: number;
  currency: string;
  purpose: string;
  donorId: string;
  donorName: string;
  orphanageId: string;
  childId?: string;
  childName?: string;
  onSuccess?: (payment: Payment) => void;
  onCancel?: () => void;
}

const PaymentProcessor = ({
  amount,
  currency,
  purpose,
  donorId,
  donorName,
  orphanageId,
  childId,
  childName,
  onSuccess,
  onCancel
}: PaymentProcessorProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const { toast } = useToast();

  const handlePayment = async () => {
    setIsProcessing(true);
    
    try {
      // Format date as ISO string for consistency
      const paymentDate = new Date().toISOString();
      
      // Prepare payment data
      const paymentData = {
        amount,
        currency,
        date: paymentDate,
        donorId,
        donorName,
        orphanageId,
        childId,
        childName,
        purpose
      };
      
      // Process the payment
      const result = await makePayment(paymentData);
      
      // Store payment details
      setPaymentId(result.id);
      setTransactionId(result.transactionId);
      
      // If there's a payment URL, redirect the user there
      if (result.paymentUrl) {
        setPaymentUrl(result.paymentUrl);
        // In a real implementation, you might open this in a new tab or iframe
        window.open(result.paymentUrl, '_blank');
      } else {
        // If no payment URL, assume direct processing
        handlePaymentConfirmation();
      }
    } catch (error) {
      toast({
        title: "Payment Error",
        description: error instanceof Error ? error.message : "Failed to initiate payment",
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };

  const handlePaymentConfirmation = async () => {
    if (!paymentId || !transactionId) {
      toast({
        title: "Error",
        description: "Payment information is missing",
        variant: "destructive",
      });
      setIsProcessing(false);
      return;
    }
    
    // Verify payment status
    const success = await confirmPayment(paymentId, transactionId);
    
    if (success && onSuccess) {
      // If payment was successful, call the success callback
      toast({
        title: "Payment Successful",
        description: "Thank you for your donation!",
      });
      onSuccess({
        id: paymentId,
        amount,
        currency,
        date: new Date().toISOString(),
        donorId,
        donorName,
        orphanageId,
        childId,
        childName,
        purpose,
        status: "successful",
        transactionId,
        createdAt: Date.now()
      });
    }
    
    setIsProcessing(false);
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <WalletCards className="h-5 w-5" />
          Process Payment
        </CardTitle>
        <CardDescription>
          Make a secure payment using our payment gateway
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between">
            <span>Amount:</span>
            <span className="font-semibold">{currency} {amount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Purpose:</span>
            <span>{purpose}</span>
          </div>
          {childName && (
            <div className="flex justify-between">
              <span>Child:</span>
              <span>{childName}</span>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onCancel} disabled={isProcessing}>
          Cancel
        </Button>
        {paymentUrl ? (
          <Button onClick={handlePaymentConfirmation} disabled={isProcessing}>
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Confirming...
              </>
            ) : (
              "Confirm Payment"
            )}
          </Button>
        ) : (
          <Button onClick={handlePayment} disabled={isProcessing}>
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              "Pay Now"
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default PaymentProcessor;
