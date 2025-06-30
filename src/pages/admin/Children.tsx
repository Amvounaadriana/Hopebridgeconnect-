import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link, useNavigate } from "react-router-dom";
import { Search, Plus, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { Child } from "@/types/models";
import { collection, query, where, getDocs, getDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getOrphanagesByAdminId } from "@/services/orphanage-service";

const AdminChildren = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const { currentUser, userProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const calculateAge = (dob: string) => {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  useEffect(() => {
    const fetchChildren = async () => {
      if (!currentUser) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        // Only fetch children for the current orphanage (admin's orphanage)
        const childrenRef = collection(db, "children");
        
        // First try to get the orphanageId from userProfile
        let orphanageId = userProfile?.orphanageId;
        
        // If not found in userProfile, try to get it from the user document
        if (!orphanageId) {
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            orphanageId = userData.orphanageId;
          }
        }
        
        // If still not found, try to get the orphanage by adminId
        if (!orphanageId) {
          const orphanages = await getOrphanagesByAdminId(currentUser.uid);
          if (orphanages.length > 0) {
            orphanageId = orphanages[0].id;
          }
        }
        
        if (!orphanageId) {
          console.error("No orphanage found for this admin");
          toast({
            variant: "destructive",
            title: "No Orphanage Found",
            description: "You need to create an orphanage first before viewing children.",
          });
          navigate("/admin/orphanage/create");
          return;
        }
        
        // Query children by orphanageId
        const q = query(childrenRef, where("orphanageId", "==", orphanageId));
        const snapshot = await getDocs(q);
        const childrenData: Child[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          childrenData.push({
            ...data,
            id: doc.id,
            name: data.name || "",
            dob: data.dob || "",
            photo: data.photo || "",
            orphanageId: data.orphanageId || "",
            gender: data.gender || "",
            documents: data.documents || [],
            createdAt: data.createdAt || null,
          });
        });
        setChildren(childrenData);
      } catch (error) {
        console.error("Error fetching children:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load children data",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchChildren();
  }, [currentUser, userProfile, toast, navigate]);

  const filteredChildren = children.filter(child =>
    child.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddChild = () => {
    navigate("/admin/children/new");
  };

  const handleViewAllOrphanages = () => {
    navigate("/admin/all-orphanages");
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h1 className="text-3xl font-bold">Children Management</h1>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleViewAllOrphanages}>
            View All Orphanages
          </Button>
          <Button onClick={handleAddChild}>
            <Plus className="mr-2 h-4 w-4" /> Add Child
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search children..."
          className="pl-10"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-hope-500" />
        </div>
      ) : filteredChildren.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredChildren.map(child => (
            <Link to={`/admin/children/${child.id}`} key={child.id}>
              <Card className="hover:bg-accent cursor-pointer transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 rounded-full overflow-hidden">
                      <img
                        src={child.photo || "/placeholder.svg"}
                        alt={child.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <h3 className="font-medium">{child.name}</h3>
                      <p className="text-muted-foreground">
                        {child.dob ? `${calculateAge(child.dob)} years old` : "No DOB"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">No children found</p>
          <Button onClick={handleAddChild}>Add Your First Child</Button>
        </div>
      )}
    </div>
  );
};

export default AdminChildren;


