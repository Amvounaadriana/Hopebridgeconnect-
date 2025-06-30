import { useState, useEffect } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { processNotchPayPayment } from "@/services/payment-gateway";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { collection, addDoc, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Orphanage, Child } from "@/types/models";

const formSchema = z.object({
  type: z.enum(["monetary", "in-kind"]),
  amount: z.string().optional()
    .refine(val => val === undefined || (!isNaN(Number(val)) && Number(val) > 0), {
      message: "Please enter a valid amount greater than 0",
    }),
  currency: z.enum(["XAF", "USD", "EUR"]),
  frequency: z.enum(["one-time", "monthly", "yearly"]),
  childId: z.string().min(1, "Please select a child to sponsor"),
  note: z.string().optional(),
});

const SponsorshipForm = () => {
  const { orphanageId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentUser, userProfile } = useAuth();
  
  const [isLoading, setIsLoading] = useState(false);
  const [orphanage, setOrphanage] = useState<Orphanage | null>(null);
  const [children, setChildren] = useState<Child[]>([]);
  
  // Add this function near the top of your component
  const getChildAge = (dob: string) => {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };
  
  // Get orphanage and children data
  useEffect(() => {
    const fetchData = async () => {
      if (!orphanageId) return;
      
      try {
        // Fetch orphanage
        const orphanageDoc = await getDoc(doc(db, "orphanages", orphanageId));
        if (orphanageDoc.exists()) {
          setOrphanage({ id: orphanageDoc.id, ...orphanageDoc.data() } as Orphanage);
        } else {
          toast({
            title: "Error",
            description: "Orphanage not found",
            variant: "destructive"
          });
          navigate("/donor/orphanages");
          return;
        }
        
        // Fetch children
        const childrenRef = collection(db, "children");
        const childrenQuery = query(childrenRef, where("orphanageId", "==", orphanageId));
        const childrenSnapshot = await getDocs(childrenQuery);
        const childrenData = childrenSnapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data() 
        })) as Child[];
        
        if (childrenData.length === 0) {
          toast({
            title: "No Children Available",
            description: "This orphanage has no children available for sponsorship at the moment.",
            variant: "destructive"
          });
        }
        
        setChildren(childrenData);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast({
          title: "Error",
          description: "Failed to load orphanage data",
          variant: "destructive"
        });
      }
    };
    
    fetchData();
  }, [orphanageId, toast, navigate]);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: "monetary",
      amount: "",
      currency: "XAF",
      frequency: "monthly",
      childId: "",
      note: "",
    },
  });
  
  const sponsorshipType = form.watch("type");
  
  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!currentUser || !userProfile || !orphanage) {
      toast({
        title: "Error",
        description: "You must be logged in to create a sponsorship",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Find selected child
      const selectedChild = children.find(child => child.id === values.childId);
      if (!selectedChild) {
        throw new Error("Selected child not found");
      }
      
      // Generate a unique reference for this sponsorship
      const sponsorshipReference = `spon_${Date.now()}_${currentUser.uid.substring(0, 5)}`;
      
      // Create the sponsorship object in Firestore
      const sponsorshipData = {
        childId: selectedChild.id,
        childName: selectedChild.name,
        orphanageId: orphanage.id,
        orphanageName: orphanage.name,
        donorId: currentUser.uid,
        donorName: userProfile.displayName || "Anonymous",
        donorEmail: userProfile.email || "",
        type: values.type,
        amount: values.type === "monetary" ? Number(values.amount) : 0,
        currency: values.currency,
        frequency: values.frequency,
        startDate: new Date().toISOString(),
        status: "pending",
        lastPayment: null,
        nextPayment: null,
        note: values.note || "",
        transactionId: sponsorshipReference,
        createdAt: Date.now()
      };
      
      // Add the sponsorship to Firestore
      const sponsorshipRef = await addDoc(collection(db, "sponsorships"), sponsorshipData);
      
      // If monetary, process payment
      if (values.type === "monetary" && Number(values.amount) > 0) {
        // Process the payment through NotchPay
        const paymentRequest = {
          amount: Number(values.amount),
          currency: values.currency,
          reference: sponsorshipReference,
          description: `Sponsorship for ${selectedChild.name} at ${orphanage.name}`,
          customerName: userProfile.displayName || "Anonymous",
          customerEmail: userProfile.email || "",
          redirectUrl: `${window.location.origin}/donor/payment-success?sponsorshipId=${sponsorshipRef.id}`
        };
        
        const paymentResponse = await processNotchPayPayment(paymentRequest);
        
        if (paymentResponse.success && paymentResponse.paymentUrl) {
          // Redirect to the payment URL
          window.location.href = paymentResponse.paymentUrl;
        } else {
          throw new Error(paymentResponse.message || "Payment processing failed");
        }
      } else {
        // For in-kind sponsorships, no payment needed
        toast({
          title: "Sponsorship Created",
          description: "Your in-kind sponsorship has been registered. The orphanage will contact you soon.",
        });
        navigate("/donor/sponsorships");
      }
    } catch (error) {
      console.error("Error processing sponsorship:", error);
      toast({
        title: "Sponsorship Error",
        description: error instanceof Error ? error.message : "Failed to create sponsorship. Please try again.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };
  
  if (!orphanage) {
    return (
      <div className="container max-w-lg mx-auto py-12 flex justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-hope-600 rounded-full border-t-transparent"></div>
      </div>
    );
  }
  
  return (
    <div className="container max-w-lg mx-auto py-12">
      <Card>
        <CardHeader>
          <CardTitle>Create a Sponsorship</CardTitle>
          <CardDescription>
            Support a child at {orphanage.name} through regular sponsorship
          </CardDescription>
        </CardHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="childId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select a Child</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a child to sponsor" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {children.map(child => (
                          <SelectItem key={child.id} value={child.id}>
                            {child.name} ({getChildAge(child.dob)} years)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Choose a child you would like to sponsor
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Sponsorship Type</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col space-y-1"
                      >
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="monetary" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Monetary (Financial support)
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="in-kind" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            In-kind (Goods, services, or time)
                          </FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {sponsorshipType === "monetary" && (
                <>
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter amount"
                            {...field}
                            type="number"
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
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select currency" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="XAF">XAF (CFA Franc)</SelectItem>
                            <SelectItem value="USD">USD (US Dollar)</SelectItem>
                            <SelectItem value="EUR">EUR (Euro)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}
              
              <FormField
                control={form.control}
                name="frequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Frequency</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select frequency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="one-time">One-time</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      How often would you like to provide support
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
                    <FormLabel>Note (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Add a personal message"
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            
            <CardFooter className="flex flex-col space-y-4 border-t pt-6">
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? "Processing..." : "Create Sponsorship"}
              </Button>
              
              <div className="text-xs text-center text-muted-foreground">
                {sponsorshipType === "monetary" ? 
                  "Your payment will be processed securely through NotchPay." :
                  "The orphanage will contact you to arrange the details of your in-kind sponsorship."
                }
              </div>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
};

export default SponsorshipForm;















