import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

const WishDetails = () => {
  const { wishId } = useParams();
  const [wish, setWish] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchWish = async () => {
      if (!wishId) return;
      setLoading(true);
      try {
        const wishDoc = await getDoc(doc(db, "wishes", wishId));
        if (!wishDoc.exists()) {
          toast({ title: "Wish Not Found", description: "This wish does not exist.", variant: "destructive" });
          navigate("/donor/wishes");
          return;
        }
        setWish({ id: wishDoc.id, ...wishDoc.data() });
      } catch (error) {
        toast({ title: "Error", description: "Failed to load wish.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    fetchWish();
  }, [wishId, toast, navigate]);

  const handlePay = () => {
    // You can implement payment logic here or redirect to payment provider
    toast({ title: "Payment", description: "Proceeding to payment (not implemented)." });
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-hope-600" /></div>;
  }
  if (!wish) return null;

  return (
    <div className="container max-w-lg mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Wish Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <strong>Child:</strong> {wish.childName || "Unknown"}
          </div>
          <div className="mb-4">
            <strong>Wish:</strong> {wish.item}
          </div>
          <div className="mb-4">
            <strong>Quantity:</strong> {wish.quantity}
          </div>
          <div className="mb-4">
            <strong>Status:</strong> {wish.status}
          </div>
          <Button onClick={handlePay} disabled={wish.status !== "pending"}>Pay by Mobile Money</Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default WishDetails;
