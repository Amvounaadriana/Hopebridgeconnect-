import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, Loader2, Upload } from "lucide-react";
import { Child } from "@/types/models";
import { useAuth } from "@/contexts/AuthContext";
import { addChild, getOrphanageById, getOrphanagesByAdminId, getChildrenByOrphanage } from "@/services/orphanage-service";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { fileToBase64, compressImage } from "@/utils/file-utils";

const AddChild = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [orphanageId, setOrphanageId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [orphanageCapacity, setOrphanageCapacity] = useState<number | null>(null);
  const [currentChildrenCount, setCurrentChildrenCount] = useState<number>(0);

  const { userProfile, currentUser } = useAuth();

  const [childData, setChildData] = useState<Partial<Child>>({
    name: "",
    dob: "",
    gender: "",
    photo: null,
    orphanageId: "", // We'll set this after fetching
    documents: []
  });

  // Fetch the orphanage ID for the current admin and children count
  useEffect(() => {
    const fetchOrphanageIdAndCounts = async () => {
      if (!currentUser?.uid) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        let id = null;
        // First check if it's in userProfile
        if (userProfile?.orphanageId) {
          id = userProfile.orphanageId;
        } else {
          // Otherwise, try to get it from the user document
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            if (userData.orphanageId) id = userData.orphanageId;
          }
        }
        if (!id) {
          // If still not found, try to get the orphanage by adminId
          const orphanages = await getOrphanagesByAdminId(currentUser.uid);
          if (orphanages.length > 0) id = orphanages[0].id;
        }
        if (!id) {
          // If we get here, no orphanage was found
          toast({
            variant: "destructive",
            title: "No Orphanage Found",
            description: "You need to create an orphanage first before adding children.",
          });
          navigate("/admin/orphanage/create");
          setLoading(false);
          return;
        }
        setOrphanageId(id);
        setChildData(prev => ({ ...prev, orphanageId: id }));
        // Fetch orphanage capacity
        const orphanage = await getOrphanageById(id);
        setOrphanageCapacity(orphanage.childrenCount);
        // Fetch current children count
        const children = await getChildrenByOrphanage(id);
        setCurrentChildrenCount(children.length);
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load orphanage information",
        });
      } finally {
        setLoading(false);
      }
    };
    fetchOrphanageIdAndCounts();
  }, [currentUser?.uid, userProfile, navigate, toast]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setChildData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setChildData(prev => ({ ...prev, [name]: value }));
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    
    try {
      setUploading(true);
      const file = e.target.files[0];
      
      // Compress and convert to base64
      const base64Data = await compressImage(file);
      
      setChildData(prev => ({ ...prev, photo: base64Data }));
      toast({
        title: "Photo uploaded",
        description: "Child photo uploaded successfully",
      });
    } catch (error) {
      console.error("Error uploading photo:", error);
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: "Failed to upload child photo",
      });
    } finally {
      setUploading(false);
    }
  };

  const atCapacity =
    orphanageCapacity !== null && currentChildrenCount >= orphanageCapacity;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (atCapacity) {
      toast({
        variant: "destructive",
        title: "Capacity Reached",
        description: "You cannot add more children than the orphanage's capacity.",
      });
      return;
    }
    
    if (!childData.name || !childData.gender || !orphanageId) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please fill all required fields",
      });
      return;
    }
    
    try {
      setSubmitting(true);
      
      // Make sure orphanageId is set
      const childToAdd = {
        ...childData,
        orphanageId: orphanageId
      };
      
      const newChild = await addChild(childToAdd as Omit<Child, 'id' | 'createdAt'>);
      
      toast({
        title: "Success!",
        description: `Child "${childData.name}" added successfully`,
      });
      
      // Navigate to the children list instead of individual child details
      navigate("/admin/children");
    } catch (error) {
      console.error("Error adding child:", error);
      toast({
        variant: "destructive",
        title: "Failed to Add Child",
        description: "There was an error adding the child. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-hope-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)}
          className="mr-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-3xl font-bold">Add New Child</h1>
      </div>

      {orphanageCapacity !== null && (
        <div className="mb-4">
          <p className="text-sm text-muted-foreground">
            Children in orphanage: {currentChildrenCount} / {orphanageCapacity}
          </p>
          {atCapacity && (
            <p className="text-sm text-red-500 font-semibold">
              You have reached the maximum number of children allowed for this orphanage.
            </p>
          )}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Child Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  name="name"
                  value={childData.name}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="dob">Date of Birth</Label>
                <Input
                  id="dob"
                  name="dob"
                  type="date"
                  value={childData.dob}
                  onChange={handleInputChange}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="gender">Gender *</Label>
                <Select 
                  value={childData.gender} 
                  onValueChange={(value) => handleSelectChange("gender", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="photo">Photo</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="photo"
                    name="photo"
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="!w-full"
                  />
                  {uploading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    <Button
                      variant="outline"
                      onClick={() => document.getElementById("photo")?.click()}
                      className="!w-full"
                    >
                      <Upload className="!mr-2 h-4 w-4" />
                      Upload Photo
                    </Button>
                  )}
                </div>
              </div>
            </div>
            <div className="!mt-6">
              <Button type="submit" disabled={submitting || atCapacity}>
                {submitting ? (
                  <>
                    <Loader2 className="!mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  atCapacity ? "Capacity Reached" : "Add Child"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AddChild;


