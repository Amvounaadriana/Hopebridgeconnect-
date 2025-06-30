
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Sponsorship } from "@/types/models";

const DonorSponsorships = () => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [sponsorships, setSponsorships] = useState<Sponsorship[]>([]);

  useEffect(() => {
    const fetchSponsorships = async () => {
      if (!currentUser) return;
      
      try {
        const sponsorshipsRef = collection(db, "sponsorships");
        const q = query(
          sponsorshipsRef,
          where("donorId", "==", currentUser.uid)
        );
        
        const snapshot = await getDocs(q);
        const sponsorshipData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Sponsorship[];
        
        setSponsorships(sponsorshipData);
      } catch (error) {
        console.error("Error fetching sponsorships:", error);
        toast({
          title: "Error",
          description: "Failed to load your sponsorships",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchSponsorships();
  }, [currentUser, toast]);

  const handleStartSponsorship = () => {
    navigate("/donor/orphanages");
  };

  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-hope-800">My Sponsorships</h1>
        <Button 
          onClick={handleStartSponsorship}
          className="bg-hope-600 hover:bg-hope-700 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Start a Sponsorship
        </Button>
      </div>
      
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-hope-600" />
        </div>
      ) : sponsorships.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">
            You have no sponsorships yet
          </p>
          <Button 
            onClick={handleStartSponsorship}
            className="bg-hope-600 hover:bg-hope-700 text-white"
          >
            Start a Sponsorship
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sponsorships.map((sponsorship) => (
            <Card key={sponsorship.id} className="overflow-hidden">
              <CardHeader className="bg-hope-50 pb-2">
                <CardTitle className="text-lg">{sponsorship.childName}</CardTitle>
                <p className="text-sm text-muted-foreground">{sponsorship.orphanageName}</p>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Type:</span>
                    <span className="font-medium capitalize">{sponsorship.type}</span>
                  </div>
                  {sponsorship.type === "monetary" && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Amount:</span>
                      <span className="font-medium">
                        {sponsorship.amount} {sponsorship.currency}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Frequency:</span>
                    <span className="font-medium capitalize">{sponsorship.frequency}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Status:</span>
                    <span className={`font-medium capitalize ${
                      sponsorship.status === "active" ? "text-green-600" : 
                      sponsorship.status === "pending" ? "text-amber-600" : "text-blue-600"
                    }`}>
                      {sponsorship.status}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Started:</span>
                    <span className="font-medium">
                      {new Date(sponsorship.startDate).toLocaleDateString()}
                    </span>
                  </div>
                  {sponsorship.nextPayment && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Next payment:</span>
                      <span className="font-medium">
                        {new Date(sponsorship.nextPayment).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="mt-4 pt-4 border-t">
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => navigate(`/donor/orphanages/${sponsorship.orphanageId}`)}
                  >
                    View Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default DonorSponsorships;




