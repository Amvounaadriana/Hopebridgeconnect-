import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { createSOSAlert, getSOSAlertsByStatus } from "@/services/sos-service";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { AlertTriangle, MapPin, Phone, Clock, CheckCircle, Users } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { SOSAlert } from "@/types/models";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix for leaflet icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
});

const VolunteerSOS = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { currentUser, userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState("send-alert");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [locationError, setLocationError] = useState("");
  const [activeAlerts, setActiveAlerts] = useState<SOSAlert[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<SOSAlert | null>(null);
  const [loadingAlerts, setLoadingAlerts] = useState(false);

  const userData = {
    id: currentUser?.uid,
    name: userProfile?.displayName,
    photo: userProfile?.photoURL,
    phoneNumber: userProfile?.phoneNumber,
  };

  useEffect(() => {
    fetchActiveAlerts();
  }, []);

  const fetchActiveAlerts = async () => {
    try {
      setLoadingAlerts(true);
      const alerts = await getSOSAlertsByStatus("active");
      setActiveAlerts(alerts);
      if (alerts.length > 0 && !selectedAlert) {
        setSelectedAlert(alerts[0]);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load active alerts",
        variant: "destructive",
      });
    } finally {
      setLoadingAlerts(false);
    }
  };

  const getLocation = () => {
    setLocationError("");
    if (!navigator.geolocation) {
      setLocationError("Geolocation not supported");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({
          lat: latitude,
          lng: longitude,
          address: `Lat: ${latitude}, Lng: ${longitude}`,
        });
      },
      () => setLocationError("Could not retrieve location")
    );
  };

  const handleSendAlert = async () => {
    if (!location) {
      setLocationError("Please share your location first");
      return;
    }
    setIsLoading(true);
    try {
      await createSOSAlert(
        userData.id,
        userData.name,
        "volunteer",
        userData.photo,
        location,
        message.trim() || null,
        userData.phoneNumber
      );
      toast({
        title: "SOS Alert Sent",
        description: "Help is on the way.",
      });
      setTimeout(() => navigate("/volunteer/dashboard"), 2000);
    } catch {
      toast({
        title: "Error",
        description: "Failed to send SOS alert",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRespondToAlert = (alertId: string) => {
    toast({
      title: "Response Sent",
      description: "You are responding to this alert",
    });
    setSelectedAlert(null);
  };

  const formatAlertTime = (timestamp: string) => {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  };

  const getInitials = (name: string | undefined) => {
    return name?.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2) || "U";
  };

  return (
    <div className="container max-w-6xl mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Emergency SOS</h1>
      <Tabs defaultValue="send-alert" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="send-alert"><AlertTriangle className="h-4 w-4 mr-2" />Send Alert</TabsTrigger>
          <TabsTrigger value="respond"><Users className="h-4 w-4 mr-2" />Respond<Badge variant="destructive" className="ml-2">{activeAlerts.length}</Badge></TabsTrigger>
        </TabsList>
        <TabsContent value="send-alert">
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-5 w-5" />
            <AlertTitle>Warning</AlertTitle>
            <AlertDescription>Only use this in real emergencies.</AlertDescription>
          </Alert>
          <Card>
            <CardHeader>
              <CardTitle>Send Emergency Alert</CardTitle>
              <CardDescription>Alert administrators to respond to your emergency.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium">Your Location</label>
                  <Button variant="outline" size="sm" onClick={getLocation} disabled={isLoading}><MapPin className="h-4 w-4 mr-2" />Share</Button>
                </div>
                {locationError && <p className="text-sm text-destructive">{locationError}</p>}
                {location && (
                  <>
                    <div className="text-sm bg-muted p-2 rounded-md flex items-start gap-2 mt-2">
                      <MapPin className="h-4 w-4 mt-1 text-muted-foreground" />
                      <span>{location.address}</span>
                    </div>
                    <div className="h-[300px] mt-2 border rounded-md overflow-hidden">
                      <MapContainer center={location ? [location.lat, location.lng] : [0, 0]} zoom={15} style={{ height: "100%", width: "100%" }}>
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        <Marker position={[location.lat, location.lng]}>
                          <Popup>Your location</Popup>
                        </Marker>
                      </MapContainer>
                    </div>
                  </>
                )}
              </div>
              <div>
                <label className="text-sm font-medium">Phone</label>
                <div className="flex items-center gap-2 bg-muted p-3 rounded-md mt-1">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{userData.phoneNumber}</span>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Emergency Details</label>
                <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Describe the emergency..." rows={3} className="resize-none mt-1" disabled={isLoading} />
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full" onClick={handleSendAlert} disabled={!location || isLoading}>
                <AlertTriangle className="mr-2 h-4 w-4" />
                {isLoading ? "Sending..." : "Send SOS Alert"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default VolunteerSOS;
