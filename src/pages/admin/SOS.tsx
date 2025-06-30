
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { getSOSAlertsByStatus, updateSOSAlertStatus } from "@/services/sos-service";
import { SOSAlert } from "@/types/models";
import { AlertTriangle, MapPin, Phone, Clock, CheckCircle, XCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const AdminSOS = () => {
  const { toast } = useToast();
  const [alerts, setAlerts] = useState<SOSAlert[]>([]);
  const [activeAlerts, setActiveAlerts] = useState<SOSAlert[]>([]);
  const [resolvedAlerts, setResolvedAlerts] = useState<SOSAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState<SOSAlert | null>(null);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        setLoading(true);
        const allAlerts = await getSOSAlertsByStatus();
        setAlerts(allAlerts);
        
        // Separate active and resolved alerts
        setActiveAlerts(allAlerts.filter(alert => 
          alert.status === "active" || alert.status === "in-progress"
        ));
        
        setResolvedAlerts(allAlerts.filter(alert => 
          alert.status === "resolved" || alert.status === "false-alarm"
        ));
        
        // Select the first active alert if any
        if (!selectedAlert && allAlerts.some(a => a.status === "active")) {
          const firstActive = allAlerts.find(a => a.status === "active") || null;
          setSelectedAlert(firstActive);
        }
      } catch (error) {
        console.error("Error fetching SOS alerts:", error);
        toast({
          title: "Error",
          description: "Failed to load SOS alerts. Please refresh the page.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();
    
    // Set up polling for new alerts
    const intervalId = setInterval(fetchAlerts, 30000); // every 30 seconds
    
    return () => clearInterval(intervalId);
  }, [toast]);

  const handleUpdateStatus = async (alertId: string, status: "in-progress" | "resolved" | "false-alarm") => {
    try {
      await updateSOSAlertStatus(alertId, status);
      
      // Update local state
      setAlerts(prev => prev.map(alert => 
        alert.id === alertId ? { ...alert, status } : alert
      ));
      
      // Update active and resolved alerts
      if (status === "resolved" || status === "false-alarm") {
        setActiveAlerts(prev => prev.filter(alert => alert.id !== alertId));
        setResolvedAlerts(prev => [
          ...prev,
          alerts.find(alert => alert.id === alertId)!
        ]);
      } else {
        setActiveAlerts(prev => prev.map(alert => 
          alert.id === alertId ? { ...alert, status } : alert
        ));
      }
      
      // Update selected alert if it's the one being updated
      if (selectedAlert && selectedAlert.id === alertId) {
        setSelectedAlert({ ...selectedAlert, status });
      }
      
      toast({
        title: "Alert Updated",
        description: `Alert status has been updated to ${status}.`,
      });
    } catch (error) {
      console.error("Error updating alert status:", error);
      toast({
        title: "Error",
        description: "Failed to update alert status. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="destructive" className="animate-pulse">Active</Badge>;
      case "in-progress":
        return <Badge variant="default" className="bg-yellow-500">In Progress</Badge>;
      case "resolved":
        return <Badge variant="outline" className="text-green-700 border-green-500">Resolved</Badge>;
      case "false-alarm":
        return <Badge variant="outline" className="text-gray-700 border-gray-500">False Alarm</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const formatAlertTime = (timestamp: number) => {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  };

  const getInitials = (name: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">SOS Alerts</h1>
          <p className="text-muted-foreground">
            Monitor and respond to emergency alerts from volunteers and children
          </p>
        </div>
        {activeAlerts.length > 0 && (
          <Badge variant="destructive" className="animate-pulse">
            {activeAlerts.filter(a => a.status === "active").length} Active Alert{activeAlerts.filter(a => a.status === "active").length !== 1 ? "s" : ""}
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Alerts List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Active Alerts</CardTitle>
          </CardHeader>
          <CardContent className="max-h-[500px] overflow-y-auto space-y-2">
            {loading ? (
              <div className="animate-pulse space-y-4">
                {[1, 2].map(i => (
                  <div key={i} className="p-4 border rounded-lg">
                    <div className="flex justify-between">
                      <div className="h-5 bg-gray-200 rounded w-1/4"></div>
                      <div className="h-5 bg-red-200 rounded w-1/4"></div>
                    </div>
                    <div className="h-4 bg-gray-200 rounded w-3/4 mt-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2 mt-2"></div>
                  </div>
                ))}
              </div>
            ) : activeAlerts.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                <p className="text-lg font-medium">No active alerts</p>
                <p className="text-muted-foreground">
                  All emergency situations have been resolved
                </p>
              </div>
            ) : (
              activeAlerts.map(alert => (
                <div
                  key={alert.id}
                  onClick={() => setSelectedAlert(alert)}
                  className={`border p-4 rounded-lg cursor-pointer hover:bg-gray-50 ${
                    selectedAlert?.id === alert.id ? "bg-gray-50 border-hope-500" : ""
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center">
                      <Avatar className="h-8 w-8 mr-3">
                        <AvatarImage src={alert.userPhoto || undefined} />
                        <AvatarFallback>{getInitials(alert.userName)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{alert.userName}</p>
                        <p className="text-xs text-muted-foreground">
                          {alert.userType === "volunteer" ? "Volunteer" : "Child"}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(alert.status)}
                  </div>
                  
                  <div className="mt-2 text-sm">
                    <div className="flex items-center text-muted-foreground">
                      <MapPin className="h-4 w-4 mr-1" />
                      <span className="truncate">{alert.location.address}</span>
                    </div>
                    <div className="flex items-center text-muted-foreground mt-1">
                      <Clock className="h-4 w-4 mr-1" />
                      <span>{formatAlertTime(alert.timestamp)}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        
        {/* Alert Details */}
        <Card className="lg:col-span-2">
          {selectedAlert ? (
            <>
              <CardHeader className="border-b">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="flex items-center">
                      {selectedAlert.status === "active" && (
                        <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
                      )}
                      Emergency Alert
                    </CardTitle>
                    <CardDescription>
                      From {selectedAlert.userName} • {formatAlertTime(selectedAlert.timestamp)}
                    </CardDescription>
                  </div>
                  {getStatusBadge(selectedAlert.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div className="flex items-start space-x-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={selectedAlert.userPhoto || undefined} />
                    <AvatarFallback>{getInitials(selectedAlert.userName)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-medium">{selectedAlert.userName}</h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedAlert.userType === "volunteer" ? "Volunteer" : "Child in need"}
                    </p>
                  </div>
                </div>
                
                <div>
                  <div className="font-medium mb-1">Contact</div>
                  <div className="flex items-center">
                    <Phone className="h-4 w-4 text-muted-foreground mr-2" />
                    <a href={`tel:${selectedAlert.phoneNumber}`} className="text-hope-600">
                      {selectedAlert.phoneNumber}
                    </a>
                    <Button variant="ghost" size="sm" className="ml-2">
                      <Phone className="h-4 w-4 mr-1" /> Call Now
                    </Button>
                  </div>
                </div>
                
                <div>
                  <div className="font-medium mb-1">Location</div>
                  <div className="bg-muted p-3 rounded-md mb-2 flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <span>{selectedAlert.location.address}</span>
                  </div>
                  <div className="rounded-lg overflow-hidden border h-[200px] bg-gray-100">
                    {/* Map placeholder - in a real app, integrate Google Maps or similar */}
                    <div className="h-full w-full flex items-center justify-center">
                      <p className="text-gray-500">Map view would be displayed here</p>
                    </div>
                  </div>
                </div>
                
                {selectedAlert.message && (
                  <div>
                    <div className="font-medium mb-1">Emergency Details</div>
                    <div className="bg-red-50 border border-red-100 text-red-800 p-3 rounded-md">
                      {selectedAlert.message}
                    </div>
                  </div>
                )}
                
                <div className="pt-2">
                  <div className="font-medium mb-2">Update Status</div>
                  <div className="flex flex-wrap gap-2">
                    {selectedAlert.status === "active" && (
                      <Button
                        onClick={() => handleUpdateStatus(selectedAlert.id!, "in-progress")}
                      >
                        Mark as In Progress
                      </Button>
                    )}
                    
                    {(selectedAlert.status === "active" || selectedAlert.status === "in-progress") && (
                      <>
                        <Button
                          variant="outline"
                          className="border-green-500 text-green-700 hover:bg-green-50"
                          onClick={() => handleUpdateStatus(selectedAlert.id!, "resolved")}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Mark as Resolved
                        </Button>
                        
                        <Button
                          variant="outline"
                          className="border-gray-500 text-gray-700"
                          onClick={() => handleUpdateStatus(selectedAlert.id!, "false-alarm")}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Mark as False Alarm
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-[500px] text-center p-4">
              <div className="p-4 rounded-full bg-gray-100 mb-4">
                <AlertTriangle className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-medium">No Alert Selected</h3>
              <p className="text-muted-foreground max-w-md mt-2">
                Select an alert from the list to view details and take action
              </p>
              {activeAlerts.length === 0 && (
                <p className="text-green-600 mt-4">
                  No active alerts at the moment. All is well!
                </p>
              )}
            </div>
          )}
        </Card>
      </div>
      
      {/* Recently Resolved Alerts */}
      <Card>
        <CardHeader>
          <CardTitle>Recently Resolved Alerts</CardTitle>
          <CardDescription>
            Alerts that have been marked as resolved or false alarm in the past 7 days
          </CardDescription>
        </CardHeader>
        <CardContent>
          {resolvedAlerts.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-muted-foreground">No recently resolved alerts</p>
            </div>
          ) : (
            <div className="divide-y">
              {resolvedAlerts.slice(0, 5).map(alert => (
                <div key={alert.id} className="py-4 flex items-center justify-between">
                  <div className="flex items-center">
                    <Avatar className="h-8 w-8 mr-3">
                      <AvatarFallback>{getInitials(alert.userName)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{alert.userName}</p>
                      <div className="flex items-center text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3 mr-1" />
                        <span className="truncate max-w-[200px]">
                          {alert.location.address}
                        </span>
                        <span className="mx-1">•</span>
                        <span>{formatAlertTime(alert.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                  {getStatusBadge(alert.status)}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSOS;
