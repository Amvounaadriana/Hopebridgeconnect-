import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { getOrphanages, getOrphanageById, updateOrphanage } from "@/services/orphanage-service";
import { useFirebaseStorage } from "@/hooks/use-firebase-storage";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Upload, Edit, Save, X, Plus, Info } from "lucide-react";
import { Orphanage } from "@/types/models";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const AdminOrphanage = () => {
  const { currentUser, userProfile } = useAuth();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [orphanages, setOrphanages] = useState<Orphanage[]>([]);
  const [editedOrphanage, setEditedOrphanage] = useState<Orphanage | null>(null);
  const [adminHasOrphanage, setAdminHasOrphanage] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { uploadFile, uploading, progress } = useFirebaseStorage("orphanages");

  // Fetch all orphanages data on component mount
  useEffect(() => {
    const fetchOrphanagesData = async () => {
      try {
        setLoading(true);
        // Use the getOrphanages function directly
        const orphanagesList = await getOrphanages();
        
        // Check if the current admin already has an orphanage
        const adminOrphanage = orphanagesList.find(
          orphanage => orphanage.adminId === currentUser?.uid
        );
        
        setAdminHasOrphanage(!!adminOrphanage);
        
        // If admin has an orphanage, set it as the first in the list
        if (adminOrphanage) {
          const reorderedList = [
            adminOrphanage,
            ...orphanagesList.filter(o => o.id !== adminOrphanage.id)
          ];
          setOrphanages(reorderedList);
        } else {
          setOrphanages(orphanagesList);
        }
      } catch (error) {
        console.error("Error fetching orphanages:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load orphanages",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchOrphanagesData();
  }, [toast, currentUser?.uid]);

  const handleEdit = (orphanage: Orphanage) => {
    // Only allow editing if the orphanage belongs to the current admin
    if (orphanage.adminId !== currentUser?.uid) {
      toast({
        variant: "destructive",
        title: "Permission Denied",
        description: "You can only edit your own orphanage",
      });
      return;
    }
    
    setEditingId(orphanage.id);
    setEditedOrphanage({ ...orphanage });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditedOrphanage(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditedOrphanage(prev => prev ? { ...prev, [name]: value } : null);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, orphanageId: string) => {
    if (!e.target.files || !e.target.files[0]) return;
    
    // Check if this orphanage belongs to the current admin
    const orphanage = orphanages.find(o => o.id === orphanageId);
    if (orphanage?.adminId !== currentUser?.uid) {
      toast({
        variant: "destructive",
        title: "Permission Denied",
        description: "You can only update your own orphanage",
      });
      return;
    }
    
    try {
      const file = e.target.files[0];
      const photoBase64 = await uploadFile(file, `${orphanageId}_${Date.now()}`);
      
      if (photoBase64) {
        // Update local state
        if (editedOrphanage && editedOrphanage.id === orphanageId) {
          setEditedOrphanage(prev => prev ? { ...prev, photo: photoBase64 } : null);
        }
        
        // Update in Firebase and local orphanages array
        await updateOrphanage(orphanageId, { photo: photoBase64 });
        setOrphanages(prev => prev.map(org => 
          org.id === orphanageId ? { ...org, photo: photoBase64 } : org
        ));
        
        toast({
          title: "Photo updated",
          description: "Orphanage photo has been updated successfully",
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editedOrphanage || !editedOrphanage.id) return;

    // Check if this orphanage belongs to the current admin
    if (editedOrphanage.adminId !== currentUser?.uid) {
      toast({
        variant: "destructive",
        title: "Permission Denied",
        description: "You can only update your own orphanage",
      });
      return;
    }

    try {
      setSubmitting(true);
      await updateOrphanage(editedOrphanage.id, editedOrphanage);
      
      // Update local state
      setOrphanages(prev => prev.map(org => 
        org.id === editedOrphanage.id ? editedOrphanage : org
      ));
      
      setEditingId(null);
      setEditedOrphanage(null);
      
      toast({
        title: "Success",
        description: "Orphanage information updated successfully",
      });
    } catch (error) {
      console.error("Error updating orphanage:", error);
      toast({
        variant: "destructive",
        title: "Update failed",
        description: "Failed to update orphanage information",
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
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">All Orphanages</h1>
        {!adminHasOrphanage && (
          <Button onClick={() => navigate("/admin/orphanage/create")}>
            <Plus className="mr-2 h-4 w-4" />
            Add New Orphanage
          </Button>
        )}
      </div>

      {orphanages.length > 0 ? (
        <div className="space-y-8">
          {orphanages.map((orphanage) => {
            const isEditing = editingId === orphanage.id;
            const currentData = isEditing ? editedOrphanage : orphanage;
            const isOwnedByCurrentAdmin = orphanage.adminId === currentUser?.uid;
            
            return (
              <div key={orphanage.id} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="md:col-span-1">
                  <CardHeader>
                    <CardTitle>
                      Orphanage Photo
                      {!isOwnedByCurrentAdmin && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 ml-2 inline text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>This orphanage is managed by another administrator</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center">
                    <div className="w-full aspect-square rounded-md overflow-hidden border mb-4">
                      {currentData?.photo ? (
                        <img 
                          src={currentData.photo} 
                          alt={currentData.name} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400">
                          No photo
                        </div>
                      )}
                    </div>
                    
                    {isEditing && isOwnedByCurrentAdmin && (
                      <div className="w-full">
                        <Label htmlFor={`photo-${orphanage.id}`} className="block mb-2">Update Photo</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            id={`photo-${orphanage.id}`}
                            name="photo"
                            type="file"
                            accept="image/*"
                            onChange={(e) => handlePhotoUpload(e, orphanage.id)}
                            disabled={uploading}
                            className="hidden"
                          />
                          <Button 
                            variant="outline" 
                            onClick={() => document.getElementById(`photo-${orphanage.id}`)?.click()}
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
                    )}
                  </CardContent>
                </Card>
                
                <Card className="md:col-span-2">
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle>{currentData?.name}</CardTitle>
                        <CardDescription>
                          {currentData?.city}, {currentData?.country}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        {!isEditing && isOwnedByCurrentAdmin ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(orphanage)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        ) : isEditing && isOwnedByCurrentAdmin ? (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleCancelEdit}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              onClick={handleSubmit}
                              disabled={submitting}
                            >
                              {submitting ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Save className="h-4 w-4" />
                              )}
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor={`name-${orphanage.id}`}>Orphanage Name</Label>
                          <Input
                            id={`name-${orphanage.id}`}
                            name="name"
                            value={currentData?.name || ''}
                            onChange={handleChange}
                            readOnly={!isEditing || !isOwnedByCurrentAdmin}
                            className={!isEditing || !isOwnedByCurrentAdmin ? "bg-gray-50" : ""}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor={`phone-${orphanage.id}`}>Phone Number</Label>
                          <Input
                            id={`phone-${orphanage.id}`}
                            name="phone"
                            value={currentData?.phone || ''}
                            onChange={handleChange}
                            readOnly={!isEditing || !isOwnedByCurrentAdmin}
                            className={!isEditing || !isOwnedByCurrentAdmin ? "bg-gray-50" : ""}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor={`email-${orphanage.id}`}>Email</Label>
                          <Input
                            id={`email-${orphanage.id}`}
                            name="email"
                            type="email"
                            value={currentData?.email || ''}
                            onChange={handleChange}
                            readOnly={!isEditing || !isOwnedByCurrentAdmin}
                            className={!isEditing || !isOwnedByCurrentAdmin ? "bg-gray-50" : ""}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor={`childrenCount-${orphanage.id}`}>Number of Children</Label>
                          <Input
                            id={`childrenCount-${orphanage.id}`}
                            name="childrenCount"
                            type="number"
                            value={currentData?.childrenCount || 0}
                            onChange={handleChange}
                            readOnly={!isEditing || !isOwnedByCurrentAdmin}
                            className={!isEditing || !isOwnedByCurrentAdmin ? "bg-gray-50" : ""}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor={`address-${orphanage.id}`}>Address</Label>
                          <Input
                            id={`address-${orphanage.id}`}
                            name="address"
                            value={currentData?.address || ''}
                            onChange={handleChange}
                            readOnly={!isEditing || !isOwnedByCurrentAdmin}
                            className={!isEditing || !isOwnedByCurrentAdmin ? "bg-gray-50" : ""}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor={`city-${orphanage.id}`}>City</Label>
                          <Input
                            id={`city-${orphanage.id}`}
                            name="city"
                            value={currentData?.city || ''}
                            onChange={handleChange}
                            readOnly={!isEditing || !isOwnedByCurrentAdmin}
                            className={!isEditing || !isOwnedByCurrentAdmin ? "bg-gray-50" : ""}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor={`country-${orphanage.id}`}>Country</Label>
                          <Input
                            id={`country-${orphanage.id}`}
                            name="country"
                            value={currentData?.country || ''}
                            onChange={handleChange}
                            readOnly={!isEditing || !isOwnedByCurrentAdmin}
                            className={!isEditing || !isOwnedByCurrentAdmin ? "bg-gray-50" : ""}
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor={`description-${orphanage.id}`}>Description</Label>
                        <Textarea
                          id={`description-${orphanage.id}`}
                          name="description"
                          value={currentData?.description || ''}
                          onChange={handleChange}
                          readOnly={!isEditing || !isOwnedByCurrentAdmin}
                          className={!isEditing || !isOwnedByCurrentAdmin ? "bg-gray-50 min-h-[100px]" : "min-h-[100px]"}
                        />
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="mb-4">No orphanages found. Create the first one.</p>
              <Button onClick={() => navigate("/admin/orphanage/create")}>
                <Plus className="mr-2 h-4 w-4" />
                Create First Orphanage
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminOrphanage;



