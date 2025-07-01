import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { 
  Card, 
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Phone, Mail, Users, ArrowLeft, Loader2 } from "lucide-react";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { getOrphanageById, getChildrenByOrphanage, getWishesByChild } from "@/services/orphanage-service";
import { useToast } from "@/components/ui/use-toast";
import { Orphanage, Child as BaseChild, Wish } from "@/types/models";

// Extend Child type to include wishes and age
type Child = BaseChild & { age: number; wishes?: Wish[] };
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Fix Leaflet marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

const DonorOrphanageDetails = () => {
  const { orphanageId } = useParams();
  const [activeTab, setActiveTab] = useState("about");
  const [orphanage, setOrphanage] = useState<Orphanage | null>(null);
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWishModal, setShowWishModal] = useState(false);
  const [selectedWish, setSelectedWish] = useState<Wish | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Fetch orphanage data
  useEffect(() => {
    const fetchOrphanageData = async () => {
      if (!orphanageId) return;
      
      try {
        setLoading(true);
        
        // Fetch orphanage details
        const orphanageData = await getOrphanageById(orphanageId);
        setOrphanage(orphanageData);
        
        // Fetch children associated with this orphanage
        const childrenData = await getChildrenByOrphanage(orphanageId);
        
        // For each child, fetch their wishes and calculate age
        const childrenWithWishes = await Promise.all(
          childrenData.map(async (child) => {
            const wishes = await getWishesByChild(child.id);
            // Calculate age from dob (assuming dob is in ISO format)
            const birthDate = new Date(child.dob);
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
              age--;
            }
            return { ...child, wishes, age };
          })
        );
        
        setChildren(childrenWithWishes);
      } catch (error) {
        console.error("Error fetching orphanage data:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load orphanage details",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchOrphanageData();
  }, [orphanageId, toast]);

  // Calculate pending wishes count
  const pendingWishes = children.flatMap(child => 
    child.wishes?.filter(wish => wish.status === "pending") || []
  ).length;

  // Helper function to get location display
  const getLocationDisplay = (): string => {
    if (!orphanage) return "Location not specified";
    if ((orphanage as any).city && (orphanage as any).country) {
      return `${(orphanage as any).city}, ${(orphanage as any).country}`;
    }
    return (orphanage as any).city || (orphanage as any).country || "Location not specified";
  };

  const allPendingWishes = children.flatMap(child =>
    (child.wishes || []).filter(wish => wish.status === "pending").map(wish => ({
      ...wish,
      childName: child.name
    }))
  );

  const handleFulfillWish = () => setShowWishModal(true);
  const handleWishSelect = (wishId: string) => {
    const wish = allPendingWishes.find(w => w.id === wishId) || null;
    setSelectedWish(wish);
  };
  const handlePay = () => {
    if (selectedWish) {
      navigate(`/donor/wish/${selectedWish.id}`);
      setShowWishModal(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-hope-600" />
      </div>
    );
  }

  if (!orphanage) {
    // Gracefully handle missing/deleted orphanage
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">Orphanage not found. It may have been deleted.</p>
        <Button onClick={() => navigate("/donor/orphanages")}>Back to Orphanages</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/donor/orphanages">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">{orphanage.name}</h1>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate(`/donor/chat?orphanageId=${orphanage.id}`)}
          >
            <Mail className="h-4 w-4 mr-1" /> Contact
          </Button>
          <Button 
            onClick={() => navigate(`/donor/donate/${orphanage.id}`)}
          >
            Donate
          </Button>
        </div>
      </div>

      <Tabs defaultValue="about" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="about">About</TabsTrigger>
          <TabsTrigger value="children">Children ({children.length})</TabsTrigger>
          <TabsTrigger value="wishes">Wishes ({pendingWishes})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="about" className="space-y-6">
          <Card>
            <CardContent className="p-0">
              <AspectRatio ratio={16 / 9}>
                <img 
                  src={orphanage.photo || "/placeholder.svg"} 
                  alt={orphanage.name}
                  className="w-full h-full object-cover"
                />
              </AspectRatio>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>About {orphanage.name}</CardTitle>
              <CardDescription>
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  <span>{getLocationDisplay()}</span>
                </div>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                {orphanage.description || "No description provided."}
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div>
                  <h3 className="font-semibold mb-4">Quick Facts</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-muted-foreground" />
                      <span>{orphanage.childrenCount || children.length || 0} children currently in care</span>
                    </div>
                  </div>
                </div>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Contact Information</CardTitle>
                    <CardDescription>Reach out to learn more or volunteer</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {orphanage.address && (
                      <div className="flex items-start gap-3">
                        <MapPin className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium">Address</p>
                          <p className="text-sm text-muted-foreground">{orphanage.address}</p>
                        </div>
                      </div>
                    )}
                    
                    {orphanage.phone && (
                      <div className="flex items-start gap-3">
                        <Phone className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium">Phone</p>
                          <p className="text-sm text-muted-foreground">{orphanage.phone}</p>
                        </div>
                      </div>
                    )}
                    
                    {orphanage.email && (
                      <div className="flex items-start gap-3">
                        <Mail className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium">Email</p>
                          <p className="text-sm text-muted-foreground">{orphanage.email}</p>
                        </div>
                      </div>
                    )}
                    
                    <div className="pt-4">
                      <Button className="w-full">Donate Now</Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Location</CardTitle>
              <CardDescription>
                <MapPin className="inline h-4 w-4 mr-1" />
                {getLocationDisplay()}
              </CardDescription>
            </CardHeader>
            <CardContent className="h-64">
              {/* Map display fallback: show message if coordinates are not available */}
              {orphanage && (orphanage as any).lat && (orphanage as any).lng ? (
                <MapContainer
                  center={[(orphanage as any).lat, (orphanage as any).lng] as [number, number]}
                  zoom={13}
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  />
                  <Marker position={[(orphanage as any).lat, (orphanage as any).lng] as [number, number]}>
                    <Popup>
                      <div className="p-1">
                        <h3 className="font-medium text-sm">{orphanage.name}</h3>
                        <p className="text-xs">{getLocationDisplay()}</p>
                      </div>
                    </Popup>
                  </Marker>
                </MapContainer>
              ) : (
                <div className="h-full bg-slate-100 flex items-center justify-center">
                  <p className="text-muted-foreground">Location coordinates not available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="children" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Children at {orphanage.name}</CardTitle>
              <CardDescription>
                Meet the children who need your support
              </CardDescription>
            </CardHeader>
            <CardContent>
              {children.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {children.map(child => (
                    <Card key={child.id} className="overflow-hidden">
                      <AspectRatio ratio={1}>
                        <img 
                          src={child.photo || "/placeholder.svg"} 
                          alt={child.name}
                          className="w-full h-full object-cover"
                        />
                      </AspectRatio>
                      <CardContent className="p-4">
                        <h3 className="font-semibold">{child.name}</h3>
                        <p className="text-sm text-muted-foreground">Age: {child.age}</p>
                        {child.wishes && child.wishes.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs font-medium">Wishes:</p>
                            <ul className="text-xs text-muted-foreground mt-1">
                              {child.wishes.slice(0, 2).map(wish => (
                                <li key={wish.id} className="flex items-center gap-1">
                                  <span className={`w-2 h-2 rounded-full ${
                                    wish.status === 'fulfilled' ? 'bg-green-500' : 
                                    wish.status === 'in-progress' ? 'bg-amber-500' : 'bg-slate-300'
                                  }`}></span>
                                  {wish.item} ({wish.quantity})
                                </li>
                              ))}
                              {child.wishes.length > 2 && (
                                <li className="text-xs italic">+ {child.wishes.length - 2} more</li>
                              )}
                            </ul>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No children information available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="wishes" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Wishes</CardTitle>
              <CardDescription>
                Help fulfill the wishes of children at {orphanage.name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {children.some(child => child.wishes && child.wishes.length > 0) ? (
                <div className="space-y-6">
                  {children.filter(child => child.wishes && child.wishes.length > 0).map(child => (
                    <div key={child.id} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <img 
                          src={child.photo || "/placeholder.svg"} 
                          alt={child.name}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                        <h3 className="font-medium">{child.name}'s Wishes</h3>
                      </div>
                      <div className="bg-slate-50 rounded-md p-4">
                        <ul className="space-y-2">
                          {child.wishes?.map(wish => (
                            <li key={wish.id} className="flex justify-between items-center">
                              <div>
                                <span className="font-medium">{wish.item}</span>
                                <span className="text-sm text-muted-foreground ml-2">
                                  (Quantity: {wish.quantity})
                                </span>
                              </div>
                              <div>
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                                  wish.status === 'fulfilled' ? 'bg-green-100 text-green-800' : 
                                  wish.status === 'in-progress' ? 'bg-amber-100 text-amber-800' : 
                                  'bg-slate-100 text-slate-800'
                                }`}>
                                  {wish.status === 'fulfilled' ? 'Fulfilled' : 
                                   wish.status === 'in-progress' ? 'In Progress' : 'Pending'}
                                </span>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                  
                  <div className="flex justify-center mt-6">
                    <Button onClick={handleFulfillWish}>Fulfill a Wish</Button>
                  </div>
                  <Dialog open={showWishModal} onOpenChange={setShowWishModal}>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Fulfill a Wish</DialogTitle>
                        <DialogDescription>
                          Select a wish to fulfill and proceed to payment.
                        </DialogDescription>
                      </DialogHeader>
                      <Select onValueChange={handleWishSelect} value={selectedWish?.id || ""}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a wish" />
                        </SelectTrigger>
                        <SelectContent>
                          {allPendingWishes.length === 0 ? (
                            <SelectItem value="" disabled>No pending wishes</SelectItem>
                          ) : (
                            allPendingWishes.map(wish => (
                              <SelectItem key={wish.id} value={wish.id}>
                                {wish.childName}: {wish.item} (Qty: {wish.quantity})
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <DialogFooter>
                        <Button onClick={handlePay} disabled={!selectedWish}>Proceed to Payment</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No wishes available at the moment</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DonorOrphanageDetails;




