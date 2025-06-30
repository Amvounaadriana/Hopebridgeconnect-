import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AlertTriangle, Calendar, Download, Mail, MapPin, Phone, User } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs, updateDoc } from "firebase/firestore";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

interface Volunteer {
  id: string;
  name: string;
  email: string;
  photo: string | null;
  skills: string[];
  availability: string;
  totalHours: number;
  phone?: string;
  address?: string;
  emergencyContact?: {
    name: string;
    phone: string;
    relation: string;
  };
  orphanageId: string;
  status: "active" | "inactive" | "pending";
  joinDate: string;
  bio?: string;
  notes?: string;
  documents?: {
    name: string;
    url: string;
    uploadDate: string;
  }[];
  tasks?: {
    id: string;
    title: string;
    date: string;
    status: "completed" | "upcoming" | "missed";
    hours: number;
  }[];
}

const VolunteerDetail = () => {
  const { volunteerId } = useParams<{ volunteerId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [volunteer, setVolunteer] = useState<Volunteer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVolunteerData = async () => {
      if (!volunteerId) {
        setError("Volunteer ID is missing");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Get volunteer document
        const volunteerRef = doc(db, "volunteers", volunteerId);
        const volunteerSnap = await getDoc(volunteerRef);
        
        if (!volunteerSnap.exists()) {
          setError("Volunteer not found");
          setLoading(false);
          return;
        }
        
        const volunteerData = volunteerSnap.data();
        
        // Get user data
        const userRef = doc(db, "users", volunteerData.userId);
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists()) {
          setError("Volunteer user data not found");
          setLoading(false);
          return;
        }
        
        const userData = userSnap.data();
        
        // Get volunteer tasks
        const tasksRef = collection(db, "tasks");
        const tasksQuery = query(
          tasksRef,
          where("volunteers", "array-contains", { id: volunteerData.userId })
        );
        
        const tasksSnap = await getDocs(tasksQuery);
        const tasks = [];
        let totalHours = 0;
        
        tasksSnap.forEach(doc => {
          const taskData = doc.data();
          
          // Only count completed tasks for total hours
          if (taskData.status === "completed") {
            totalHours += taskData.duration || 0;
          }
          
          tasks.push({
            id: doc.id,
            title: taskData.title,
            date: taskData.date,
            status: taskData.status,
            hours: taskData.duration || 0
          });
        });
        
        // Create volunteer object with all necessary data
        const volunteerObj: Volunteer = {
          id: volunteerSnap.id,
          name: userData.displayName || "",
          email: userData.email || "",
          photo: userData.photoURL || null,
          skills: Array.isArray(userData.skills) ? userData.skills : [],
          availability: Array.isArray(userData.availability?.days)
            ? userData.availability.days.join(", ")
            : "",
          totalHours,
          phone: userData.phoneNumber || "",
          address: userData.location || "",
          emergencyContact: userData.emergencyContact || {
            name: "",
            phone: "",
            relation: ""
          },
          orphanageId: volunteerData.orphanageId || "",
          status: volunteerData.status || "pending",
          joinDate: volunteerData.joinDate 
            ? format(new Date(volunteerData.joinDate), "MMMM d, yyyy")
            : format(new Date(), "MMMM d, yyyy"),
          bio: userData.bio || "",
          notes: volunteerData.notes || "",
          documents: volunteerData.documents || [],
          tasks
        };
        
        setVolunteer(volunteerObj);
      } catch (error) {
        console.error("Error fetching volunteer data:", error);
        setError("Failed to load volunteer data");
      } finally {
        setLoading(false);
      }
    };
    
    fetchVolunteerData();
  }, [volunteerId]);

  const handleDismiss = async () => {
    if (!volunteer) return;
    
    try {
      // Implement dismissal logic directly since import is failing
      const volunteerRef = doc(db, "volunteers", volunteer.id);
      await updateDoc(volunteerRef, { 
        status: "inactive",
        dismissalReason: "Dismissed by administrator",
        dismissedAt: Date.now()
      });
      
      // If there's a user document associated with this volunteer
      if (volunteer.id) {
        const userRef = doc(db, "users", volunteer.id);
        await updateDoc(userRef, { 
          status: "inactive"
        });
      }
      
      toast({
        title: "Volunteer Dismissed",
        description: `${volunteer.name} has been removed from your orphanage.`
      });
      navigate("/admin/volunteers");
    } catch (error) {
      console.error("Error dismissing volunteer:", error);
      toast({
        title: "Error",
        description: "Failed to dismiss volunteer. Please try again.",
        variant: "destructive"
      });
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex items-center mb-6">
          <Skeleton className="h-12 w-12 rounded-full mr-4" />
          <Skeleton className="h-8 w-48" />
        </div>
        
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4 text-center">
        <div className="flex flex-col items-center justify-center py-12">
          <AlertTriangle className="h-16 w-16 text-red-500 mb-4" />
          <h2 className="text-2xl font-bold mb-2">Volunteer not found</h2>
          <p className="text-muted-foreground mb-6">
            {error}
          </p>
          <Button onClick={() => navigate("/admin/volunteers")}>
            Back to Volunteers
          </Button>
        </div>
      </div>
    );
  }

  if (!volunteer) {
    return (
      <div className="container mx-auto p-4 text-center">
        <div className="flex flex-col items-center justify-center py-12">
          <AlertTriangle className="h-16 w-16 text-red-500 mb-4" />
          <h2 className="text-2xl font-bold mb-2">Volunteer not found</h2>
          <p className="text-muted-foreground mb-6">
            The volunteer you're looking for doesn't exist or has been removed.
          </p>
          <Button onClick={() => navigate("/admin/volunteers")}>
            Back to Volunteers
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div className="flex items-center mb-4 md:mb-0">
          <Avatar className="h-12 w-12 mr-4">
            <AvatarImage src={volunteer.photo || ""} alt={volunteer.name} />
            <AvatarFallback>{getInitials(volunteer.name)}</AvatarFallback>
          </Avatar>
          <h1 className="text-2xl font-bold">{volunteer.name}</h1>
        </div>
        
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => navigate("/admin/volunteers")}>
            Back to List
          </Button>
          <Button variant="destructive" onClick={handleDismiss}>
            Dismiss Volunteer
          </Button>
        </div>
      </div>
      
      <Tabs defaultValue="profile">
        <TabsList className="mb-6">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="tasks">Tasks & Hours</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>
        
        <TabsContent value="profile">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Volunteer Information</CardTitle>
                <CardDescription>Personal details and contact information</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-2">About</h3>
                    <p className="text-muted-foreground">
                      {volunteer.bio || "No bio provided."}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center">
                      <Mail className="h-5 w-5 mr-2 text-muted-foreground" />
                      <span>{volunteer.email}</span>
                    </div>
                    <div className="flex items-center">
                      <Phone className="h-5 w-5 mr-2 text-muted-foreground" />
                      <span>{volunteer.phone || "No phone number"}</span>
                    </div>
                    <div className="flex items-center">
                      <MapPin className="h-5 w-5 mr-2 text-muted-foreground" />
                      <span>{volunteer.address || "No address provided"}</span>
                    </div>
                    <div className="flex items-center">
                      <Calendar className="h-5 w-5 mr-2 text-muted-foreground" />
                      <span>Joined: {volunteer.joinDate}</span>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium mb-2">Skills</h3>
                    <div className="flex flex-wrap gap-2">
                      {volunteer.skills && volunteer.skills.length > 0 ? (
                        volunteer.skills.map((skill, index) => (
                          <Badge key={index} variant="secondary">
                            {skill}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-muted-foreground">No skills listed</span>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium mb-2">Availability</h3>
                    <p className="text-muted-foreground">
                      {volunteer.availability || "No availability information"}
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium mb-2">Emergency Contact</h3>
                    {volunteer.emergencyContact?.name ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Name</p>
                          <p>{volunteer.emergencyContact.name}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Phone</p>
                          <p>{volunteer.emergencyContact.phone}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Relation</p>
                          <p>{volunteer.emergencyContact.relation}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No emergency contact provided</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Volunteer Status</CardTitle>
                <CardDescription>Current status and hours</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Status</p>
                    <Badge className={
                      volunteer.status === "active" ? "bg-green-500" :
                      volunteer.status === "pending" ? "bg-yellow-500" :
                      "bg-red-500"
                    }>
                      {volunteer.status.charAt(0).toUpperCase() + volunteer.status.slice(1)}
                    </Badge>
                  </div>
                  
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Total Hours</p>
                    <div className="text-3xl font-bold">{volunteer.totalHours}</div>
                  </div>
                  
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Admin Notes</p>
                    <p className="text-sm">
                      {volunteer.notes || "No notes added yet"}
                    </p>
                  </div>
                  
                  <div className="pt-4">
                    <Button className="w-full" variant="outline">
                      Edit Volunteer
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="tasks">
          <Card>
            <CardHeader>
              <CardTitle>Tasks & Hours Log</CardTitle>
              <CardDescription>
                Record of volunteer activities and hours
              </CardDescription>
            </CardHeader>
            <CardContent>
              {volunteer.tasks && volunteer.tasks.length > 0 ? (
                <div className="space-y-4">
                  {volunteer.tasks.map(task => (
                    <div key={task.id} className="border rounded-md p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium">{task.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            {task.date}
                          </p>
                        </div>
                        <div className="flex items-center">
                          <Badge className={
                            task.status === "completed" ? "bg-green-500" :
                            task.status === "upcoming" ? "bg-blue-500" :
                            "bg-red-500"
                          }>
                            {task.status}
                          </Badge>
                          <span className="ml-2 text-sm font-medium">
                            {task.hours} hours
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium">No Tasks Yet</h3>
                  <p className="text-muted-foreground mt-2">
                    This volunteer hasn't been assigned to any tasks yet.
                  </p>
                  <Button variant="outline" className="mt-4">
                    Assign to Task
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle>Documents</CardTitle>
              <CardDescription>
                Volunteer documents and certifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              {volunteer.documents && volunteer.documents.length > 0 ? (
                <div className="space-y-4">
                  {volunteer.documents.map((doc, index) => (
                    <div key={index} className="flex justify-between items-center border rounded-md p-4">
                      <div>
                        <h3 className="font-medium">{doc.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          Uploaded on {doc.uploadDate}
                        </p>
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <a href={doc.url} target="_blank" rel="noopener noreferrer">
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </a>
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Download className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium">No Documents</h3>
                  <p className="text-muted-foreground mt-2">
                    This volunteer hasn't uploaded any documents yet.
                  </p>
                  <Button variant="outline" className="mt-4">
                    Request Documents
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default VolunteerDetail;



