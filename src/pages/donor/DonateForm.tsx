
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { processNotchPayPayment } from "@/services/payment-gateway";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { collection, addDoc, serverTimestamp, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Orphanage } from "@/types/models";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const formSchema = z.object({
  amount: z.string()
    .refine(val => !isNaN(Number(val)) && Number(val) > 0, {
      message: "Please enter a valid amount greater than 0",
    }),
  currency: z.enum(["XAF", "USD", "EUR"]),
  paymentType: z.enum(["one-time", "monthly"]),
  purpose: z.enum(["general", "education", "health", "food", "shelter", "clothing", "other"]),
  paymentMethod: z.enum(["notchpay", "momo", "orange"]),
  note: z.string().optional(),
});

const DonateForm = () => {
  const { orphanageId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentUser, userProfile } = useAuth();
  
  const [isLoading, setIsLoading] = useState(false);
  const [orphanage, setOrphanage] = useState<Orphanage | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("notchpay");
  
  // Get orphanage data
  useState(() => {
    const fetchOrphanage = async () => {
      if (!orphanageId) return;
      
      try {
        const orphanageDoc = await getDoc(doc(db, "orphanages", orphanageId));
        if (orphanageDoc.exists()) {
          setOrphanage({ id: orphanageDoc.id, ...orphanageDoc.data() } as Orphanage);
        }
      } catch (error) {
        console.error("Error fetching orphanage:", error);
      }
    };
    
    fetchOrphanage();
  });
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: "",
      currency: "XAF",
      paymentType: "one-time",
      purpose: "general",
      paymentMethod: "notchpay",
      note: "",
    },
  });
  
  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!currentUser || !userProfile || !orphanage) {
      toast({
        title: "Error",
        description: "You must be logged in to make a donation",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Generate a unique reference for this payment
      const paymentReference = `don_${Date.now()}_${currentUser.uid.substring(0, 5)}`;
      
      // Log the payment data for debugging
      console.log("Payment data:", {
        amount: Number(values.amount),
        currency: values.currency,
        paymentType: values.paymentType,
        purpose: values.purpose,
        paymentMethod: paymentMethod
      });
      
      // Create the payment object in Firestore first
      const paymentData = {
        amount: Number(values.amount),
        currency: values.currency,
        date: new Date().toISOString(),
        donorId: currentUser.uid,
        donorName: userProfile.displayName || "Anonymous",
        donorEmail: userProfile.email || "",
        orphanageId: orphanage.id,
        orphanageName: orphanage.name,
        purpose: values.purpose,
        status: "pending",
        transactionId: paymentReference,
        createdAt: Date.now(),
        paymentType: values.paymentType,
        paymentMethod: paymentMethod,
        note: values.note || "",
      };
      
      // Add the payment to Firestore
      const paymentRef = await addDoc(collection(db, "payments"), paymentData);
      console.log("Payment added to Firestore with ID:", paymentRef.id);
      
      // Process the payment through NotchPay
      const paymentRequest = {
        amount: Number(values.amount),
        currency: values.currency,
        reference: paymentReference,
        description: `Donation to ${orphanage.name} for ${values.purpose}`,
        customerName: userProfile.displayName || "Anonymous",
        customerEmail: userProfile.email || "",
        redirectUrl: `${window.location.origin}/donor/payment-success?paymentId=${paymentRef.id}`
      };
      
      console.log("Processing payment with request:", paymentRequest);
      
      const paymentResponse = await processNotchPayPayment(paymentRequest);
      console.log("Payment response:", paymentResponse);
      
      if (paymentResponse.success && paymentResponse.paymentUrl) {
        // Redirect to the payment URL
        console.log("Redirecting to payment URL:", paymentResponse.paymentUrl);
        window.location.href = paymentResponse.paymentUrl;
      } else {
        throw new Error(paymentResponse.message || "Payment processing failed");
      }
    } catch (error) {
      console.error("Error processing payment:", error);
      toast({
        title: "Payment Error",
        description: error instanceof Error ? error.message : "Failed to process payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="container max-w-2xl mx-auto py-6">
      <Button
        variant="ghost"
        onClick={() => navigate(-1)}
        className="mb-4"
      >
        &larr; Back
      </Button>
      
      <Card>
        <CardHeader>
          <CardTitle>Make a Donation</CardTitle>
          <CardDescription>
            Your donation will directly support {orphanage?.name || "this orphanage"} in Cameroon
          </CardDescription>
        </CardHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <CardContent className="space-y-6">
              <div className="grid gap-6">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter amount"
                            type="number"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="currency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Currency</FormLabel>
                        <FormControl>
                          <RadioGroup
                            className="flex space-x-2"
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormItem className="flex items-center space-x-1">
                              <FormControl>
                                <RadioGroupItem value="XAF" />
                              </FormControl>
                              <FormLabel className="font-normal">XAF</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-1">
                              <FormControl>
                                <RadioGroupItem value="USD" />
                              </FormControl>
                              <FormLabel className="font-normal">USD</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-1">
                              <FormControl>
                                <RadioGroupItem value="EUR" />
                              </FormControl>
                              <FormLabel className="font-normal">EUR</FormLabel>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="paymentType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Donation Frequency</FormLabel>
                      <FormControl>
                        <RadioGroup
                          className="flex space-x-4"
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormItem className="flex items-center space-x-2">
                            <FormControl>
                              <RadioGroupItem value="one-time" />
                            </FormControl>
                            <FormLabel className="font-normal">One-time donation</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-2">
                            <FormControl>
                              <RadioGroupItem value="monthly" />
                            </FormControl>
                            <FormLabel className="font-normal">Monthly recurring</FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormDescription>
                        Monthly donations help provide consistent support
                      </FormDescription>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="purpose"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Purpose</FormLabel>
                      <FormControl>
                        <RadioGroup
                          className="grid grid-cols-2 gap-2"
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormItem className="flex items-center space-x-2">
                            <FormControl>
                              <RadioGroupItem value="general" />
                            </FormControl>
                            <FormLabel className="font-normal">General support</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-2">
                            <FormControl>
                              <RadioGroupItem value="education" />
                            </FormControl>
                            <FormLabel className="font-normal">Education</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-2">
                            <FormControl>
                              <RadioGroupItem value="health" />
                            </FormControl>
                            <FormLabel className="font-normal">Healthcare</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-2">
                            <FormControl>
                              <RadioGroupItem value="food" />
                            </FormControl>
                            <FormLabel className="font-normal">Food</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-2">
                            <FormControl>
                              <RadioGroupItem value="shelter" />
                            </FormControl>
                            <FormLabel className="font-normal">Shelter</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-2">
                            <FormControl>
                              <RadioGroupItem value="clothing" />
                            </FormControl>
                            <FormLabel className="font-normal">Clothing</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-2">
                            <FormControl>
                              <RadioGroupItem value="other" />
                            </FormControl>
                            <FormLabel className="font-normal">Other</FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="paymentMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Method</FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(value);
                          setPaymentMethod(value);
                        }}
                        defaultValue="notchpay"
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select payment method" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="notchpay">NotchPay</SelectItem>
                          <SelectItem value="momo">MTN Mobile Money</SelectItem>
                          <SelectItem value="orange">Orange Money</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Choose your preferred payment method
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="note"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Personal Note (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Add a personal message to the orphanage"
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
            
            <CardFooter className="flex flex-col space-y-4 border-t pt-6">
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? "Processing..." : "Proceed to Payment"}
              </Button>
              
              <div className="text-xs text-center text-muted-foreground">
                Your donation will be processed securely through NotchPay.
                A receipt will be emailed to you after payment is complete.
              </div>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
};

export default DonateForm;








