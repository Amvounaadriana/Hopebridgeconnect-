import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, FileUp, Loader2, ArrowLeft, Trash2 } from "lucide-react";
import { getChildById, updateChild, uploadChildPhoto, getWishesByChild, addWish } from "@/services/orphanage-service";
import { useToast } from "@/components/ui/use-toast";
import { useFirebaseStorage } from "@/hooks/use-firebase-storage";
import { format } from "date-fns";
import { Child, Wish } from "@/types/models";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";

const AdminChildDetails = () => {
  const { childId } = useParams<{ childId: string }>();
  const [activeTab, setActiveTab] = useState("profile");
  const [child, setChild] = useState<Child | null>(null);
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { uploadFile, uploading } = useFirebaseStorage(`children/${childId}`);
  const { currentUser, userProfile } = useAuth();

  // New wish state
  const [newWish, setNewWish] = useState({
    item: "",
    description: "",
    quantity: 1
  });
  const [showWishDialog, setShowWishDialog] = useState(false);

  // Fetch child data
  useEffect(() => {
    const fetchChildData = async () => {
      if (!childId) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "No child ID provided",
        });
        navigate("/admin/children");
        return;
      }
      
      try {
        setLoading(true);
        
        // Get child data from the real API
        const childData = await getChildById(childId);
        setChild(childData);
        
        // Fetch wishes for this child
        const childWishes = await getWishesByChild(childId);
        setWishes(childWishes);
      } catch (error) {
        console.error("Error fetching child data:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load child details. Child may not exist.",
        });
        // Navigate back to children list if child doesn't exist
        navigate("/admin/children");
      } finally {
        setLoading(false);
      }
    };

    fetchChildData();
  }, [childId, toast, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setChild(prev => prev ? { ...prev, [name]: value } : null);
  };

  const handleNewWishChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewWish(prev => ({ ...prev, [name]: name === 'quantity' ? parseInt(value) || 1 : value }));
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !childId) return;
    
    try {
      const file = e.target.files[0];
      
      // Upload photo using the real API
      const photoURL = await uploadChildPhoto(file, childId);
      
      if (photoURL) {
        setChild(prev => prev ? { ...prev, photo: photoURL } : null);
        toast({
          title: "Photo updated",
          description: "Child's photo has been updated successfully",
        });
      }
    } catch (error) {
      console.error("Error uploading photo:", error);
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: "Failed to upload child's photo",
      });
    }
  };

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !childId || !child) return;
    
    try {
      const file = e.target.files[0];
      
      // Upload document using Firebase storage
      const fileURL = await uploadFile(file);
      
      if (fileURL) {
        const newDocument = {
          id: Date.now().toString(),
          name: file.name,
          type: file.type,
          url: fileURL
        };
        
        const updatedChild = {
          ...child,
          documents: [...(child.documents || []), newDocument]
        };
        
        // Update child with new document
        await updateChild(childId, { documents: updatedChild.documents });
        setChild(updatedChild);
        
        toast({
          title: "Document uploaded",
          description: "Document has been added successfully",
        });
      }
    } catch (error) {
      console.error("Error uploading document:", error);
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: "Failed to upload document",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!child || !childId) return;

    try {
      setSaving(true);
      
      // Update child using the real API
      await updateChild(childId, child);
      setIsEditing(false);
      toast({
        title: "Success",
        description: "Child information updated successfully",
      });
    } catch (error) {
      console.error("Error updating child:", error);
      toast({
        variant: "destructive",
        title: "Update failed",
        description: "Failed to update child information",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAddWish = async () => {
    if (!childId || !child || !userProfile) return;
    
    if (!newWish.item.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter an item name",
      });
      return;
    }
    
    try {
      const wishData = {
        childId,
        childName: child.name,
        orphanageId: userProfile.uid,
        item: newWish.item,
        description: newWish.description,
        quantity: newWish.quantity,
        date: new Date().toISOString().split('T')[0],
        status: "pending" as const,
        donorId: null,
        donorName: null,
        createdAt: Date.now()
      };
      
      // Add wish using the real API
      await addWish(wishData);
      setNewWish({ item: "", description: "", quantity: 1 });
      setShowWishDialog(false);
      
      // Refresh wishes list
      const updatedWishes = await getWishesByChild(childId);
      setWishes(updatedWishes);
      
      toast({
        title: "Wish added",
        description: "The wish has been added successfully",
      });
    } catch (error) {
      console.error("Error adding wish:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add wish",
      });
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!child || !childId) return;
    
    try {
      const updatedDocuments = child.documents?.filter(doc => doc.id !== documentId) || [];
      const updatedChild = { ...child, documents: updatedDocuments };
      
      await updateChild(childId, { documents: updatedDocuments });
      setChild(updatedChild);
      
      toast({
        title: "Document deleted",
        description: "Document has been removed successfully",
      });
    } catch (error) {
      console.error("Error deleting document:", error);
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: "Failed to delete document",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-hope-500" />
      </div>
    );
  }

  if (!child) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">Child not found</p>
        <Button onClick={() => navigate("/admin/children")}>Back to Children List</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center">
          <Button variant="ghost" onClick={() => navigate("/admin/children")} className="mr-2">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold">{child.name}</h1>
        </div>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
              <Button onClick={() => document.getElementById("child-form")?.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }))}>
                {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : "Save Changes"}
              </Button>
            </>
          ) : (
            <Button onClick={() => setIsEditing(true)}>Edit Child</Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-2">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="wishes">Wish Wall</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Child Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <form id="child-form" onSubmit={handleSubmit}>
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="w-full md:w-1/3">
                    <div className="rounded-md overflow-hidden border mb-4 aspect-square">
                      <img 
                        src={child.photo || "/placeholder.svg"} 
                        alt={child.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <Input
                      id="photo-upload"
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                      disabled={uploading}
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="w-full mb-4" 
                      onClick={() => document.getElementById("photo-upload")?.click()}
                      disabled={uploading}
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <FileUp className="mr-2 h-4 w-4" /> Update Photo
                        </>
                      )}
                    </Button>
                  </div>
                  
                  <div className="w-full md:w-2/3 space-y-4">
                    <div>
                      <Label htmlFor="name">Full Name</Label>
                      <Input 
                        id="name" 
                        name="name" 
                        value={child.name} 
                        onChange={handleChange} 
                        readOnly={!isEditing}
                        className={!isEditing ? "bg-gray-50" : ""}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="dob">Date of Birth</Label>
                      <Input 
                        id="dob" 
                        name="dob" 
                        type="date" 
                        value={child.dob} 
                        onChange={handleChange} 
                        readOnly={!isEditing}
                        className={!isEditing ? "bg-gray-50" : ""}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="gender">Gender</Label>
                      <Input 
                        id="gender" 
                        name="gender" 
                        value={child.gender} 
                        onChange={handleChange} 
                        readOnly={!isEditing}
                        className={!isEditing ? "bg-gray-50" : ""}
                      />
                    </div>
                  </div>
                </div>
              </form>
              
              <div className="mt-6">
                <Label>Documents</Label>
                <div className="mt-2 space-y-2 border rounded-md p-4">
                  {child.documents && child.documents.length > 0 ? (
                    child.documents.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileUp className="h-4 w-4" />
                          <a 
                            href={doc.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            {doc.name}
                          </a>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDeleteDocument(doc.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-center py-2">No documents uploaded yet</p>
                  )}
                  
                  <Input
                    id="document-upload"
                    type="file"
                    onChange={handleDocumentUpload}
                    className="hidden"
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    className="mt-4"
                    onClick={() => document.getElementById("document-upload")?.click()}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Plus className="mr-2 h-4 w-4" /> Add Document
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="wishes" className="space-y-4">
          <div className="flex justify-between">
            <h2 className="text-xl font-semibold">Wish List</h2>
            <Dialog open={showWishDialog} onOpenChange={setShowWishDialog}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" /> Add Wish
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add a New Wish</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="item">Item Name</Label>
                    <Input
                      id="item"
                      name="item"
                      value={newWish.item}
                      onChange={handleNewWishChange}
                      placeholder="What does the child wish for?"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      name="description"
                      value={newWish.description}
                      onChange={handleNewWishChange}
                      placeholder="Provide details about the wish"
                      className="h-24 resize-none"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantity</Label>
                    <Input
                      id="quantity"
                      name="quantity"
                      type="number"
                      min="1"
                      value={newWish.quantity}
                      onChange={handleNewWishChange}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowWishDialog(false)}>Cancel</Button>
                  <Button onClick={handleAddWish}>Add Wish</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          
          <div className="grid gap-4">
            {wishes.length > 0 ? (
              wishes.map(wish => (
                <Card key={wish.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-medium">{wish.item}</h3>
                        <p className="text-sm text-muted-foreground">Quantity: {wish.quantity}</p>
                        {wish.description && (
                          <p className="mt-2 text-sm">{wish.description}</p>
                        )}
                        {wish.donorName && (
                          <p className="text-xs text-green-600 mt-1">Donor: {wish.donorName}</p>
                        )}
                      </div>
                      <div>
                        <span className={`px-3 py-1 rounded-full text-xs ${
                          wish.status === "fulfilled" ? "bg-green-100 text-green-800" :
                          wish.status === "in-progress" ? "bg-blue-100 text-blue-800" :
                          "bg-gray-100 text-gray-800"
                        }`}>
                          {wish.status}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">No wishes added yet</p>
                <Button size="sm" onClick={() => setShowWishDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" /> Add First Wish
                </Button>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminChildDetails;