import { useState } from "react";
import { CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { createPaymentIntent, confirmCardPayment } from "@/services/stripe-service";
import { toast } from "@/components/ui/sonner";

interface StripePaymentFormProps {
  amount: number;
  currency: string;
  purpose: string;
  onSuccess: (paymentId: string) => void;
  onCancel: () => void;
}

export default function StripePaymentForm({
  amount,
  currency,
  purpose,
  onSuccess,
  onCancel
}: StripePaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      // Stripe.js has not loaded yet
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Create payment intent on the server
      const { clientSecret } = await createPaymentIntent(amount, currency);

      // Confirm the payment with the card element
      const cardElement = elements.getElement(CardElement);
      
      if (!cardElement) {
        throw new Error("Card element not found");
      }

      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: 'Anonymous', // You can pass actual user details here
          },
        },
        description: purpose,
      });

      if (result.error) {
        setError(result.error.message || "Payment failed");
        toast({
          title: "Payment Failed",
          description: result.error.message || "Your payment could not be processed",
        });
      } else {
        if (result.paymentIntent.status === 'succeeded') {
          toast({
            title: "Payment Successful",
            description: "Thank you for your donation!",
          });
          onSuccess(result.paymentIntent.id);
        } else {
          // Handle other statuses
          setError(`Payment status: ${result.paymentIntent.status}`);
        }
      }
    } catch (err) {
      console.error("Payment error:", err);
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
      toast({
        title: "Payment Error",
        description: err instanceof Error ? err.message : "An unexpected error occurred",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Make a Payment</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent>
          <div className="mb-4">
            <p className="text-sm text-gray-500 mb-2">Amount: {amount} {currency.toUpperCase()}</p>
            <p className="text-sm text-gray-500 mb-4">Purpose: {purpose}</p>
            <div className="p-3 border rounded-md">
              <CardElement 
                options={{
                  style: {
                    base: {
                      fontSize: '16px',
                      color: '#424770',
                      '::placeholder': {
                        color: '#aab7c4',
                      },
                    },
                    invalid: {
                      color: '#9e2146',
                    },
                  },
                }}
              />
            </div>
            {error && <p className="text-red-500 mt-2 text-sm">{error}</p>}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={!stripe || isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              `Pay ${amount} ${currency.toUpperCase()}`
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}