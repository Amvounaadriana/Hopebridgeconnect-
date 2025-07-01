// CreateOrphanage.tsx - Updated to use base64 storage in Firestore
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Upload } from "lucide-react";
import { createOrphanage } from "@/services/orphanage-service";
import { useFirebaseStorage } from "@/hooks/use-firebase-storage";

const CreateOrphanage = () => {
  const { currentUser, userProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const { uploadFile, uploading, progress } = useFirebaseStorage("orphanages");
  const [orphanageData, setOrphanageData] = useState({
    name: "",
    address: "",
    city: "",
    country: "",
    phone: "",
    email: "",
    description: "",
    childrenCount: 0,
    needs: [""],
    photo: null as string | null,
    latitude: "",
    longitude: ""
  });
  const [hasOrphanage, setHasOrphanage] = useState<boolean>(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    async function checkOrphanage() {
      if (!currentUser?.uid) return;
      try {
        const res = await import("@/services/orphanage-service");
        // Only check orphanages for the current admin
        const orphanages = await res.getOrphanagesByAdminId(currentUser.uid);
        setHasOrphanage(orphanages.length > 0);
      } catch (e) {
        setHasOrphanage(false);
      }
    }
    checkOrphanage();
  }, [currentUser]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setOrphanageData(prev => ({ ...prev, [name]: value }));
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    
    try {
      const file = e.target.files[0];
      
      // Use the uploadFile function from our hook
      const photoBase64 = await uploadFile(file);
      
      if (photoBase64) {
        setOrphanageData(prev => ({ ...prev, photo: photoBase64 }));
        toast({
          title: "Photo uploaded",
          description: "Orphanage photo uploaded successfully",
        });
      }
    } catch (error) {
      console.error("Error uploading photo:", error);
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: "Failed to upload orphanage photo",
      });
    }
  };

  const handleNeedsChange = (index: number, value: string) => {
    const updatedNeeds = [...orphanageData.needs];
    updatedNeeds[index] = value;
    setOrphanageData(prev => ({ ...prev, needs: updatedNeeds }));
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setOrphanageData(prev => ({
      ...prev,
      [name]: Number(value)
    }));
  };

  const addNeed = () => {
    setOrphanageData(prev => ({ ...prev, needs: [...prev.needs, ""] }));
  };

  const removeNeed = (index: number) => {
    const updatedNeeds = orphanageData.needs.filter((_, i) => i !== index);
    setOrphanageData(prev => ({ ...prev, needs: updatedNeeds }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orphanageData.name || !orphanageData.address || !orphanageData.city || !orphanageData.country) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please fill all required fields",
      });
      return;
    }
    // Filter out empty needs
    const filteredNeeds = orphanageData.needs.filter(need => need.trim() !== "");
    try {
      setLoading(true);
      // Use the real Firebase service
      const newOrphanage = await createOrphanage({
        name: orphanageData.name,
        photo: orphanageData.photo,
        address: orphanageData.address,
        city: orphanageData.city,
        country: orphanageData.country,
        phone: orphanageData.phone,
        email: orphanageData.email,
        description: orphanageData.description,
        childrenCount: orphanageData.childrenCount,
        needs: filteredNeeds,
        adminId: currentUser.uid,
        location: `${orphanageData.city}, ${orphanageData.country}`
      });
      
      // Update admin user profile with orphanageId
      if (newOrphanage.id) {
        try {
          const { doc, updateDoc, getDoc } = await import("firebase/firestore");
          const { db } = await import("@/lib/firebase");
          const userRef = doc(db, "users", currentUser.uid);
          await updateDoc(userRef, {
            orphanageId: newOrphanage.id
          });
        } catch (err) {
          toast({
            variant: "destructive",
            title: "Profile Update Failed",
            description: "Orphanage created, but failed to update your profile with orphanageId. Please contact support.",
          });
        }
      }
      
      console.log("Created orphanage:", newOrphanage);
      
      toast({
        title: "Success!",
        description: `Orphanage "${orphanageData.name}" created successfully`,
      });
      
      navigate("/admin/orphanage");
    } catch (error) {
      console.error("Error creating orphanage:", error);
      toast({
        variant: "destructive",
        title: "Creation Failed",
        description: "Failed to create orphanage. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  if (hasOrphanage) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh]">
        <h2 className="text-2xl font-semibold mb-4">You already have an orphanage.</h2>
        <Button onClick={() => navigate("/admin/orphanage")}>Go to Orphanage</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Create New Orphanage</h1>
        <Button 
          variant="outline" 
          onClick={() => navigate("/admin/orphanage")}
        >
          Back to Orphanage
        </Button>
      </div>
      
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle>Orphanage Photo</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              <div className="w-full aspect-square rounded-md overflow-hidden border mb-4">
                {orphanageData.photo ? (
                  <img 
                    src={orphanageData.photo} 
                    alt="Orphanage" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400">
                    No photo uploaded
                  </div>
                )}
              </div>
              
              <div className="w-full">
                <Label htmlFor="photo" className="block mb-2">Upload Photo</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="photo"
                    name="photo"
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                  <Button 
                    type="button"
                    variant="outline" 
                    onClick={() => document.getElementById('photo')?.click()}
                    disabled={uploading}
                    className="w-full"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Upload Image
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Orphanage Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <Label htmlFor="name">Orphanage Name *</Label>
                  <Input
                    id="name"
                    name="name"
                    value={orphanageData.name}
                    onChange={handleInputChange}
                    required
                    placeholder="Enter orphanage name"
                  />
                </div>
                
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={orphanageData.email}
                    onChange={handleInputChange}
                    required
                    placeholder="contact@orphanage.com"
                  />
                </div>
                
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    name="phone"
                    value={orphanageData.phone}
                    onChange={handleInputChange}
                    placeholder="+237 xxx xxx xxx"
                  />
                </div>
                
                <div>
                  <Label htmlFor="childrenCount">Number of Children</Label>
                  <Input
                    id="childrenCount"
                    name="childrenCount"
                    type="number"
                    min="0"
                    value={orphanageData.childrenCount}
                    onChange={handleNumberChange}
                    placeholder="0"
                  />
                </div>
                
                <div>
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    name="country"
                    value={orphanageData.country}
                    onChange={handleInputChange}
                    placeholder="Cameroon"
                  />
                </div>
                
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    name="city"
                    value={orphanageData.city}
                    onChange={handleInputChange}
                    placeholder="Yaoundé"
                  />
                </div>
                
                <div>
                  <Label htmlFor="latitude">Latitude</Label>
                  <Input
                    id="latitude"
                    name="latitude"
                    type="text"
                    value={orphanageData.latitude}
                    onChange={handleInputChange}
                    placeholder="e.g., 3.8480"
                  />
                </div>
                <div>
                  <Label htmlFor="longitude">Longitude</Label>
                  <Input
                    id="longitude"
                    name="longitude"
                    type="text"
                    value={orphanageData.longitude}
                    onChange={handleInputChange}
                    placeholder="e.g., 11.5021"
                  />
                </div>
              </div>
              
              <div className="mb-4">
                <Label htmlFor="address">Address *</Label>
                <Input
                  id="address"
                  name="address"
                  value={orphanageData.address}
                  onChange={handleInputChange}
                  required
                  placeholder="Enter full address"
                />
              </div>
              
              <div className="mb-4">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={orphanageData.description}
                  onChange={handleInputChange}
                  rows={4}
                  placeholder="Tell us about your orphanage, its mission, and what makes it special..."
                />
              </div>
              
              <div className="mb-6">
                <Label className="block mb-2">Current Needs</Label>
                <p className="text-sm text-gray-600 mb-3">
                  List the items or support your orphanage currently needs
                </p>
                {orphanageData.needs.map((need, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <Input
                      value={need}
                      onChange={(e) => handleNeedsChange(index, e.target.value)}
                      placeholder="e.g., Food supplies, School materials, Medical care"
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="icon"
                      onClick={() => removeNeed(index)}
                      disabled={orphanageData.needs.length === 1}
                    >
                      ✕
                    </Button>
                  </div>
                ))}
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={addNeed}
                  className="mt-2"
                >
                  + Add Another Need
                </Button>
              </div>
              
              <div className="flex gap-4">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => navigate("/admin/orphanage")}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={loading || uploading}
                  className="flex-1"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating Orphanage...
                    </>
                  ) : (
                    "Create Orphanage"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
};

export default CreateOrphanage;







