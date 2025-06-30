
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, Loader2 } from "lucide-react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { verifyNotchPayPayment } from "@/services/payment-gateway";

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const paymentId = searchParams.get("paymentId");
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [verificationFailed, setVerificationFailed] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState<any>(null);

  useEffect(() => {
    const verifyPayment = async () => {
      if (!paymentId) {
        setIsLoading(false);
        return;
      }

      try {
        console.log("Verifying payment with ID:", paymentId);
        
        // Get the payment document
        const paymentDoc = await getDoc(doc(db, "payments", paymentId));
        
        if (!paymentDoc.exists()) {
          throw new Error("Payment not found");
        }
        
        const paymentData = paymentDoc.data();
        setPaymentDetails(paymentData);
        
        console.log("Payment data:", paymentData);
        
        // Verify payment with NotchPay
        const isVerified = await verifyNotchPayPayment(paymentData.transactionId);
        console.log("Payment verification result:", isVerified);
        
        if (isVerified) {
          // Update payment status
          await updateDoc(doc(db, "payments", paymentId), {
            status: "successful",
            updatedAt: Date.now()
          });
          
          toast({
            title: "Payment Successful",
            description: "Your donation has been processed successfully. Thank you for your support!",
          });
        } else {
          setVerificationFailed(true);
          toast({
            title: "Payment Verification Failed",
            description: "We couldn't verify your payment. Please contact support.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Error verifying payment:", error);
        setVerificationFailed(true);
        toast({
          title: "Error",
          description: "An error occurred while processing your payment.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    verifyPayment();
  }, [paymentId, toast]);

  const handleGoToDashboard = () => {
    navigate("/donor/dashboard");
  };

  return (
    <div className="container max-w-lg mx-auto py-12">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Processing Payment
              </>
            ) : verificationFailed ? (
              "Payment Verification Failed"
            ) : (
              <>
                <CheckCircle className="h-5 w-5 text-green-500" />
                Payment Successful
              </>
            )}
          </CardTitle>
          <CardDescription>
            {isLoading ? "Please wait while we verify your payment..." : 
             verificationFailed ? "We couldn't verify your payment" : 
             "Your donation has been successfully processed"}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {!isLoading && !verificationFailed && paymentDetails && (
            <div className="space-y-4">
              <div className="flex justify-between">
                <span>Amount:</span>
                <span className="font-semibold">{paymentDetails.currency} {paymentDetails.amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Purpose:</span>
                <span>{paymentDetails.purpose}</span>
              </div>
              <div className="flex justify-between">
                <span>Orphanage:</span>
                <span>{paymentDetails.orphanageName}</span>
              </div>
              <div className="flex justify-between">
                <span>Transaction ID:</span>
                <span className="text-xs">{paymentDetails.transactionId}</span>
              </div>
              <div className="mt-6 text-center text-sm text-muted-foreground">
                A receipt has been sent to your email address.
              </div>
            </div>
          )}
          
          {verificationFailed && (
            <div className="text-center text-sm text-muted-foreground">
              If you believe this is an error, please contact our support team with your transaction reference.
            </div>
          )}
        </CardContent>
        
        <CardFooter>
          <Button 
            onClick={handleGoToDashboard} 
            className="w-full"
            disabled={isLoading}
          >
            Go to Dashboard
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default PaymentSuccess;












