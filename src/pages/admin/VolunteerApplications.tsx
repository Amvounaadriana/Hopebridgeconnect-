import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { 
  collection, query, where, getDocs, doc, 
  updateDoc, deleteDoc, serverTimestamp 
} from "firebase/firestore";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  Check, X, User, Calendar, Clock, Mail, Phone, 
  MapPin, Loader2, Search 
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { 
  Dialog, DialogContent, DialogDescription, 
  DialogHeader, DialogTitle, DialogFooter 
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { sendVolunteerApprovalEmail, sendVolunteerRejectionEmail } from "@/services/email";
import OrphanageMap from "@/components/OrphanageMap";
import { geocodeAddress } from "@/utils/geocode";

interface Application {
  id: string;
  volunteerId: string;
  volunteerName: string;
  volunteerPhoto: string | null;
  orphanageId: string;
  orphanageName: string;
  status: "pending" | "approved" | "rejected";
  message: string;
  createdAt: any;
  volunteerDetails?: {
    email: string;
    phone: string;
    location: string;
    bio: string;
    availability: {
      days: string[];
    };
    emergencyContact: {
      name: string;
      phone: string;
      relation: string;
    };
  };
}

export default function VolunteerApplications() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { userProfile } = useAuth();

  // Type guard: orphanageId must exist for admin to view applications
  useEffect(() => {
    if (!userProfile || !('orphanageId' in userProfile) || !userProfile.orphanageId) {
      toast({
        title: "Access Denied",
        description: "You must be an orphanage administrator to view applications. Please ensure your admin profile includes an orphanageId.",
        variant: "destructive"
      });
      navigate("/admin/dashboard");
    }
  }, [userProfile, navigate, toast]);
  
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectionDialog, setShowRejectionDialog] = useState(false);
  const [processingAction, setProcessingAction] = useState(false);
  const [orphanageCoords, setOrphanageCoords] = useState<{lat: number, lng: number} | null>(null);
  
  useEffect(() => {
    const fetchApplications = async () => {
      // Type guard: orphanageId must exist for admin to view applications
      if (!userProfile || !userProfile.orphanageId) {
        toast({
          title: "Access Denied",
          description: "You must be an orphanage administrator to view applications. Please ensure your admin profile includes an orphanageId.",
          variant: "destructive"
        });
        navigate("/admin/dashboard");
        return;
      }

      try {
        setLoading(true);
        
        // Query applications for this orphanage
        const applicationsRef = collection(db, "volunteerApplications");
        const q = query(
          applicationsRef,
          where("orphanageId", "==", userProfile.orphanageId),
          where("status", "==", "pending")
        );
        
        const querySnapshot = await getDocs(q);
        const applicationsList: Application[] = [];
        
        // Process each application and fetch volunteer details
        for (const doc of querySnapshot.docs) {
          const appData = doc.data() as Omit<Application, "id">;
          
          // Fetch volunteer details
          const userRef = collection(db, "users");
          const userQuery = query(userRef, where("uid", "==", appData.volunteerId));
          const userSnapshot = await getDocs(userQuery);
          
          let volunteerDetails = undefined;
          if (!userSnapshot.empty) {
            const userData = userSnapshot.docs[0].data();
            volunteerDetails = {
              email: userData.email || "",
              phone: userData.phoneNumber || "",
              location: userData.location || "",
              bio: userData.bio || "",
              availability: {
                days: userData.availability?.days || [],
              },
              emergencyContact: userData.emergencyContact || {
                name: "",
                phone: "",
                relation: "",
              },
            };
          }
          
          applicationsList.push({
            id: doc.id,
            ...appData,
            volunteerDetails
          } as Application);
        }
        
        setApplications(applicationsList);
      } catch (error) {
        console.error("Error fetching applications:", error);
        toast({
          title: "Error",
          description: "Failed to load volunteer applications",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchApplications();
  }, [userProfile, navigate, toast]);
  
  useEffect(() => {
    async function fetchCoords() {
      if (userProfile?.orphanageName) {
        const coords = await geocodeAddress(userProfile.orphanageName);
        setOrphanageCoords(coords);
      }
    }
    fetchCoords();
  }, [userProfile?.orphanageName]);
  
  const handleApprove = async (application: Application) => {
    if (!application.volunteerDetails?.email) {
      toast({
        title: "Error",
        description: "Volunteer email not found",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setProcessingAction(true);
      
      // Update application status
      await updateDoc(doc(db, "volunteerApplications", application.id), {
        status: "approved",
        approvedAt: serverTimestamp(),
        approvedBy: userProfile?.uid
      });
      
      // Update user record
      await updateDoc(doc(db, "users", application.volunteerId), {
        status: "active",
        orphanageId: application.orphanageId,
        orphanageName: application.orphanageName
      });
      
      // Send approval email
      await sendVolunteerApprovalEmail(
        application.volunteerDetails.email,
        application.volunteerName,
        application.orphanageName
      );
      
      // Update local state
      setApplications(prev => prev.filter(app => app.id !== application.id));
      
      toast({
        title: "Volunteer Approved",
        description: `${application.volunteerName} has been approved as a volunteer`
      });
    } catch (error) {
      console.error("Error approving volunteer:", error);
      toast({
        title: "Error",
        description: "Failed to approve volunteer application",
        variant: "destructive"
      });
    } finally {
      setProcessingAction(false);
    }
  };
  
  const openRejectionDialog = (application: Application) => {
    setSelectedApplication(application);
    setRejectionReason("");
    setShowRejectionDialog(true);
  };
  
  const handleReject = async () => {
    if (!selectedApplication || !selectedApplication.volunteerDetails?.email) {
      toast({
        title: "Error",
        description: "Volunteer email not found",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setProcessingAction(true);
      
      // Update application status
      await updateDoc(doc(db, "volunteerApplications", selectedApplication.id), {
        status: "rejected",
        rejectedAt: serverTimestamp(),
        rejectedBy: userProfile?.uid,
        rejectionReason: rejectionReason
      });
      
      // Send rejection email
      await sendVolunteerRejectionEmail(
        selectedApplication.volunteerDetails.email,
        selectedApplication.volunteerName,
        selectedApplication.orphanageName,
        rejectionReason
      );
      
      // Update local state
      setApplications(prev => prev.filter(app => app.id !== selectedApplication.id));
      
      toast({
        title: "Application Rejected",
        description: `${selectedApplication.volunteerName}'s application has been rejected`
      });
      
      setShowRejectionDialog(false);
    } catch (error) {
      console.error("Error rejecting volunteer:", error);
      toast({
        title: "Error",
        description: "Failed to reject volunteer application",
        variant: "destructive"
      });
    } finally {
      setProcessingAction(false);
    }
  };
  
  const filteredApplications = applications.filter(app => 
    app.volunteerName.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };
  
  return (
    <div className="container py-10">
      <div className="flex flex-col space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Volunteer Applications</h1>
          <div className="relative w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search applications..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredApplications.length === 0 ? (
          <Card className="flex flex-col items-center justify-center py-10">
            <CardContent className="text-center">
              <User className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium">No Pending Applications</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                There are no pending volunteer applications at this time.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredApplications.map(application => (
              <Card key={application.id} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-4">
                      <Avatar className="h-10 w-10">
                        {application.volunteerPhoto ? (
                          <AvatarImage src={application.volunteerPhoto} alt={application.volunteerName} />
                        ) : (
                          <AvatarFallback>{getInitials(application.volunteerName)}</AvatarFallback>
                        )}
                      </Avatar>
                      <div>
                        <CardTitle className="text-lg">{application.volunteerName}</CardTitle>
                        <CardDescription>
                          Applied {application.createdAt?.toDate ? 
                            new Date(application.createdAt.toDate()).toLocaleDateString() : 
                            "Recently"}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant="outline">Pending</Badge>
                  </div>
                </CardHeader>
                <CardContent className="pb-2">
                  <div className="space-y-3">
                    {application.volunteerDetails?.email && (
                      <div className="flex items-center text-sm">
                        <Mail className="mr-2 h-4 w-4 text-muted-foreground" />
                        <span>{application.volunteerDetails.email}</span>
                      </div>
                    )}
                    {application.volunteerDetails?.phone && (
                      <div className="flex items-center text-sm">
                        <Phone className="mr-2 h-4 w-4 text-muted-foreground" />
                        <span>{application.volunteerDetails.phone}</span>
                      </div>
                    )}
                    {application.volunteerDetails?.location && (
                      <div className="flex items-center text-sm">
                        <MapPin className="mr-2 h-4 w-4 text-muted-foreground" />
                        <span>{application.volunteerDetails.location}</span>
                      </div>
                    )}
                    {application.volunteerDetails?.availability?.days?.length > 0 && (
                      <div className="flex items-start text-sm">
                        <Calendar className="mr-2 h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                        <span>Available on {application.volunteerDetails.availability.days.join(", ")}</span>
                      </div>
                    )}
                    {application.message && (
                      <div className="mt-4 text-sm">
                        <p className="font-medium mb-1">Message:</p>
                        <p className="text-muted-foreground">{application.message}</p>
                      </div>
                    )}
                    {orphanageCoords && (
                      <div className="mt-4">
                        <OrphanageMap lat={orphanageCoords.lat} lng={orphanageCoords.lng} name={userProfile?.orphanageName || "Orphanage"} />
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between pt-4">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => openRejectionDialog(application)}
                    disabled={processingAction}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Reject
                  </Button>
                  <Button 
                    size="sm"
                    onClick={() => handleApprove(application)}
                    disabled={processingAction}
                  >
                    <Check className="mr-2 h-4 w-4" />
                    Approve
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
      
      <Dialog open={showRejectionDialog} onOpenChange={setShowRejectionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Volunteer Application</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this application. This will be included in the email sent to the volunteer.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Textarea
              placeholder="Reason for rejection..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRejectionDialog(false)}
              disabled={processingAction}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={handleReject}
              disabled={processingAction || !rejectionReason.trim()}
            >
              {processingAction ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Confirm Rejection"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
