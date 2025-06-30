import React, { useState, useEffect } from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Search, Plus, Loader2, Check, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { 
  getWishesByOrphanage, 
  getChildrenByOrphanage, 
  addWish, 
  updateWishStatus, 
  getOrphanagesByAdminId 
} from "@/services/orphanage-service";
import { Wish, Child } from "@/types/models";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

const AdminWishes = () => {
  const { userProfile, currentUser } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWishDialog, setShowWishDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [orphanageId, setOrphanageId] = useState<string | null>(null);
  
  const [newWish, setNewWish] = useState({
    childId: "",
    item: "",
    description: "",
    quantity: 1
  });

  // Fetch wishes and children data
  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser?.uid) return;
      
      try {
        setLoading(true);
        
        // First try to get the orphanageId from userProfile
        let orphId = userProfile?.orphanageId;
        
        // If not found in userProfile, try to get it from the user document
        if (!orphId) {
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            orphId = userData.orphanageId;
          }
        }
        
        // If still not found, try to get the orphanage by adminId
        if (!orphId) {
          const orphanages = await getOrphanagesByAdminId(currentUser.uid);
          if (orphanages.length > 0) {
            orphId = orphanages[0].id;
          }
        }
        
        if (!orphId) {
          console.error("No orphanage found for this admin");
          toast({
            variant: "destructive",
            title: "No Orphanage Found",
            description: "You need to create an orphanage first before managing wishes.",
          });
          return;
        }
        
        setOrphanageId(orphId);
        
        // Fetch wishes
        const wishesData = await getWishesByOrphanage(orphId);
        setWishes(wishesData);
        
        // Fetch children
        const childrenData = await getChildrenByOrphanage(orphId);
        console.log("Fetched children data:", childrenData); // Debug log
        setChildren(childrenData);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load wishes data",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUser, userProfile, toast]);

  const handleNewWishChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewWish(prev => ({
      ...prev,
      [name]: name === "quantity" ? parseInt(value) || 1 : value
    }));
  };

  // Add a function to refresh children
  const refreshChildren = async () => {
    if (!orphanageId) return;
    setLoading(true);
    try {
      const childrenData = await getChildrenByOrphanage(orphanageId);
      setChildren(childrenData);
      toast({ title: "Children list refreshed" });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to refresh children list",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddWish = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newWish.childId || !newWish.item || !orphanageId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a child and enter an item name",
      });
      return;
    }
    
    try {
      setSubmitting(true);
      
      const selectedChild = children.find(child => child.id === newWish.childId);
      
      if (!selectedChild) {
        throw new Error("Selected child not found");
      }
      
      const wishData = {
        childId: newWish.childId,
        childName: selectedChild.name,
        orphanageId: orphanageId,
        item: newWish.item,
        description: newWish.description,
        quantity: newWish.quantity,
        date: new Date().toISOString().split('T')[0],
        status: "pending" as const,
        donorId: null,
        donorName: null,
        createdAt: Date.now()
      };
      
      await addWish(wishData);
      
      // Reset form and close dialog
      setNewWish({ childId: "", item: "", description: "", quantity: 1 });
      setShowWishDialog(false);
      
      // Refresh wishes list
      const updatedWishes = await getWishesByOrphanage(orphanageId);
      setWishes(updatedWishes);
      
      // Refresh children list in case a new child was added elsewhere
      await refreshChildren();
      toast({
        title: "Success",
        description: "Wish added successfully",
      });
    } catch (error) {
      console.error("Error adding wish:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add wish",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (wishId: string, status: "pending" | "in-progress" | "fulfilled") => {
    try {
      await updateWishStatus(wishId, status);
      
      // Update local state
      setWishes(prev => prev.map(wish => 
        wish.id === wishId ? { ...wish, status } : wish
      ));
      
      toast({
        title: "Status Updated",
        description: `Wish status changed to ${status}`,
      });
    } catch (error) {
      console.error("Error updating wish status:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update wish status",
      });
    }
  };

  // Filter wishes based on search query and status filter
  const filteredWishes = wishes.filter(wish => {
    const matchesSearch = 
      wish.item?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      wish.childName?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || wish.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Children's Wishes</h1>
        
        <Dialog open={showWishDialog} onOpenChange={setShowWishDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Add Wish
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add a New Wish</DialogTitle>
              <DialogDescription>
                Create a new wish for a child in your orphanage
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddWish}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="childId">Child</Label>
                  <div className="flex gap-2 items-center">
                    <Select 
                      name="childId" 
                      value={newWish.childId} 
                      onValueChange={(value) => setNewWish(prev => ({ ...prev, childId: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={children.length > 0 ? "Select a child" : "No children available"} />
                      </SelectTrigger>
                      <SelectContent>
                        {children.length > 0 ? (
                          children.map(child => (
                            <SelectItem key={child.id} value={child.id || ""}>
                              {child.name || "Unnamed Child"}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="none" disabled>No children available</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <Button type="button" size="sm" variant="outline" onClick={refreshChildren} disabled={loading}>
                      Refresh
                    </Button>
                  </div>
                  {children.length === 0 && (
                    <p className="text-sm text-red-500 mt-1">
                      You need to add children to your orphanage first
                    </p>
                  )}
                </div>
                
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
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    name="description"
                    value={newWish.description}
                    onChange={handleNewWishChange}
                    placeholder="Add more details about the wish"
                    rows={3}
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
                <Button type="button" variant="outline" onClick={() => setShowWishDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    "Add Wish"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-end">
        <div className="w-full sm:w-1/3 relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search wishes..."
            className="pl-10"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="w-full sm:w-1/3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in-progress">In Progress</SelectItem>
              <SelectItem value="fulfilled">Fulfilled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : wishes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <p className="text-muted-foreground mb-4">No wishes have been added yet</p>
            <Button onClick={() => setShowWishDialog(true)}>
              <Plus className="mr-2 h-4 w-4" /> Add First Wish
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Child</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Donor</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredWishes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    No wishes match your search criteria
                  </TableCell>
                </TableRow>
              ) : (
                filteredWishes.map(wish => (
                  <TableRow key={wish.id}>
                    <TableCell>{wish.childName}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{wish.item}</div>
                        {wish.description && (
                          <div className="text-sm text-muted-foreground">{wish.description}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{wish.quantity}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        wish.status === "fulfilled" ? "bg-green-100 text-green-800" :
                        wish.status === "in-progress" ? "bg-blue-100 text-blue-800" :
                        "bg-gray-100 text-gray-800"
                      }`}>
                        {wish.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      {wish.donorName || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {wish.status === "pending" && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleUpdateStatus(wish.id!, "in-progress")}
                          >
                            Mark In Progress
                          </Button>
                        )}
                        {wish.status !== "fulfilled" && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleUpdateStatus(wish.id!, "fulfilled")}
                          >
                            <Check className="h-4 w-4 mr-1" /> Mark Fulfilled
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default AdminWishes;





