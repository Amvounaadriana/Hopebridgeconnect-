import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Calendar, Plus, Loader2, Clock, Mail, Phone } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { collection, getDocs, query, where, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Badge } from "@/components/ui/badge";

// Define Volunteer interface
interface Volunteer {
  id: string;
  name: string;
  email: string;
  photo: string | null;
  skills: string[];
  totalHours: number;
  phone?: string;
  location?: string;
  orphanageId?: string;
  status?: string;
}

const AdminVolunteers = () => {
  const navigate = useNavigate();
  const { userProfile, currentUser } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [skillFilter, setSkillFilter] = useState<string>("all");
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch volunteers data
  useEffect(() => {
    const fetchVolunteers = async () => {
      // Get orphanageId for this admin (from orphanage collection)
      let orphanageId: string | null = null;
      if (userProfile?.role === "admin") {
        // Try to get orphanage by adminId
        const orphanagesRef = collection(db, "orphanages");
        const qOrph = query(orphanagesRef, where("adminId", "==", currentUser?.uid));
        const orphanagesSnap = await getDocs(qOrph);
        if (!orphanagesSnap.empty) {
          orphanageId = orphanagesSnap.docs[0].id;
        }
      }
      if (!orphanageId) {
        setError("No orphanage associated with this account");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        // Query users collection for volunteers associated with this orphanage
        const usersRef = collection(db, "users");
        const q = query(
          usersRef, 
          where("role", "==", "volunteer"),
          where("orphanageId", "==", orphanageId)
        );
        const querySnapshot = await getDocs(q);
        const volunteersData: Volunteer[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          // Only show volunteers whose status is 'active' (approved)
          if (data.status === "active" || data.status === "pending") {
            volunteersData.push({
              id: doc.id,
              name: data.displayName || "Unknown",
              email: data.email || "",
              photo: data.photoURL || null,
              skills: Array.isArray(data.skills) ? data.skills : [],
              totalHours: data.totalHours || 0,
              phone: data.phoneNumber || "",
              location: data.location || "",
              orphanageId: data.orphanageId || "",
              status: data.status || "active"
            });
          }
        });
        setVolunteers(volunteersData);
      } catch (error) {
        console.error("Error fetching volunteers:", error);
        setError("Failed to load volunteers");
        toast({
          title: "Error",
          description: "Failed to load volunteers data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    fetchVolunteers();
  }, [userProfile, currentUser, toast]);

  // Filter volunteers based on search query and skill filter
  const filteredVolunteers = volunteers.filter(volunteer => {
    const matchesSearch = 
      volunteer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      volunteer.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesSkill = 
      skillFilter === "all" || 
      (volunteer.skills && volunteer.skills.includes(skillFilter));
    
    return matchesSearch && matchesSkill;
  });

  // Get initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  // Handle navigation to add volunteer page
  const handleAddVolunteer = () => {
    navigate("/admin/volunteers/new");
  };

  // Handle navigation to calendar view
  const handleViewCalendar = () => {
    navigate("/admin/calendar");
  };

  // Handle navigation to volunteer details
  const handleViewVolunteerDetails = (volunteerId: string) => {
    navigate(`/admin/volunteers/${volunteerId}`);
  };

  // Get all unique skills from volunteers for the filter dropdown
  const allSkills = Array.from(
    new Set(volunteers.flatMap(volunteer => volunteer.skills || []))
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Volunteers</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleViewCalendar}>
            <Calendar className="mr-2 h-4 w-4" /> View Calendar
          </Button>
          <Button onClick={handleAddVolunteer}>
            <Plus className="mr-2 h-4 w-4" /> Add Volunteer
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-end">
        <div className="w-full sm:w-1/2 relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search volunteers..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-1/2">
          <Select value={skillFilter} onValueChange={setSkillFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by skill" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Skills</SelectItem>
              {allSkills.map((skill) => (
                <SelectItem key={skill} value={skill}>
                  {skill}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="text-center py-12 border rounded-lg">
          <p className="text-red-500 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      ) : filteredVolunteers.length === 0 ? (
        <div className="text-center py-12 border rounded-lg">
          <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium">No matching volunteers</h3>
          <p className="text-muted-foreground mb-4">
            Try adjusting your search or filter criteria
          </p>
          <Button onClick={handleAddVolunteer}>
            <Plus className="mr-2 h-4 w-4" /> Add Volunteer
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVolunteers.map(volunteer => (
            <Card key={volunteer.id} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="bg-hope-100 p-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12 border-2 border-white">
                      <AvatarImage src={volunteer.photo || undefined} alt={volunteer.name} />
                      <AvatarFallback>{getInitials(volunteer.name)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold">{volunteer.name}</h3>
                      <p className="text-sm text-muted-foreground">{volunteer.location}</p>
                    </div>
                  </div>
                </div>
                <div className="p-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{volunteer.email}</span>
                  </div>
                  {volunteer.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{volunteer.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{volunteer.totalHours} hours contributed</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-2">Skills</p>
                    <div className="flex flex-wrap gap-1">
                      {volunteer.skills && volunteer.skills.length > 0 ? (
                        volunteer.skills.map((skill, index) => (
                          <Badge key={index} variant="outline" className="bg-gray-100">
                            {skill}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-sm text-muted-foreground">No skills listed</span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-gray-50 p-4">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => handleViewVolunteerDetails(volunteer.id)}
                >
                  View Details
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminVolunteers;


