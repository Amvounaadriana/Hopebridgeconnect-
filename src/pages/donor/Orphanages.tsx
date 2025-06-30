
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, MapPin, Loader2 } from "lucide-react";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { getOrphanages } from "@/services/orphanage-service";
import { useToast } from "@/components/ui/use-toast";
import { Orphanage } from "@/types/models";
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import type { MapContainerProps } from 'react-leaflet';
import type { LatLngExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet marker icon issue
// This is needed because of how Leaflet handles assets
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

const DonorOrphanages = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [orphanages, setOrphanages] = useState<Orphanage[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  // Default map center (Cameroon)
  const mapCenter: LatLngExpression = [7.3697, 12.3547];
  
  // Fetch orphanages data
  useEffect(() => {
    const fetchOrphanages = async () => {
      try {
        setLoading(true);
        const orphanagesData = await getOrphanages();
        setOrphanages(orphanagesData);
      } catch (error) {
        console.error("Error fetching orphanages:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load orphanages data",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchOrphanages();
  }, [toast]);

  const filteredOrphanages = orphanages.filter(orphanage => 
    orphanage.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (orphanage.city && orphanage.city.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (orphanage.country && orphanage.country.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Helper function to get location display
  const getLocationDisplay = (orphanage: Orphanage): string => {
    if (orphanage.city && orphanage.country) {
      return `${orphanage.city}, ${orphanage.country}`;
    }
    return orphanage.city || orphanage.country || "Location not specified";
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Orphanages</h1>
      
      <div className="flex flex-col md:flex-row gap-4 justify-between">
        <div className="relative w-full md:w-2/3">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search orphanages by name or location..."
            className="pl-10"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant={viewMode === "list" ? "default" : "outline"}
            onClick={() => setViewMode("list")}
          >
            List View
          </Button>
          <Button 
            variant={viewMode === "map" ? "default" : "outline"}
            onClick={() => setViewMode("map")}
          >
            Map View
          </Button>
        </div>
      </div>
      
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-hope-600" />
        </div>
      ) : viewMode === "list" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOrphanages.length > 0 ? (
            filteredOrphanages.map(orphanage => (
              <Link key={orphanage.id} to={`/donor/orphanages/${orphanage.id}`}>
                <Card className="h-full overflow-hidden hover:shadow-md transition-shadow">
                  <div className="relative">
                    <AspectRatio ratio={16 / 9}>
                      <img 
                        src={orphanage.photo || "/placeholder.svg"} 
                        alt={orphanage.name}
                        className="w-full h-full object-cover"
                      />
                    </AspectRatio>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-lg">{orphanage.name}</h3>
                    <div className="flex items-center gap-1 text-muted-foreground mb-2">
                      <MapPin className="h-3 w-3" />
                      <span className="text-sm">{getLocationDisplay(orphanage)}</span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {orphanage.description || "No description provided."}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs bg-hope-50 text-hope-700 px-2 py-1 rounded-full">
                        {orphanage.childrenCount || 0} children
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <p className="text-muted-foreground">No orphanages found matching your search</p>
            </div>
          )}
        </div>
      ) : (
        <Card className="overflow-hidden">
          <div className="h-[500px] relative">
            <MapContainer 
              // @ts-expect-error: center prop is valid at runtime but missing from MapContainerProps type
              center={mapCenter as [number, number]}
              zoom={6} 
              style={{ height: '100%', width: '100%' }}
            >
            
              <TileLayer
                // @ts-expect-error: attribution prop is valid for TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              {filteredOrphanages.map(orphanage => {
                // Skip orphanages without coordinates
                if (!orphanage.coordinates?.lat || !orphanage.coordinates?.lng) return null;
                
                return (
                  <Marker 
                    key={orphanage.id}
                    position={[orphanage.coordinates.lat, orphanage.coordinates.lng]}
                  >
                    <Popup>
                      <div className="p-1">
                        <h3 className="font-medium text-sm">{orphanage.name}</h3>
                        <p className="text-xs">{getLocationDisplay(orphanage)}</p>
                        <Link 
                          to={`/donor/orphanages/${orphanage.id}`}
                          className="text-xs text-blue-600 hover:underline block mt-1"
                        >
                          View Details
                        </Link>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
            
            {/* Fallback if no orphanages have coordinates */}
            {filteredOrphanages.length > 0 && 
             filteredOrphanages.every(o => !o.coordinates?.lat || !o.coordinates?.lng) && (
              <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center p-4 z-[400]">
                <p className="text-lg font-medium mb-2">No Location Data Available</p>
                <p className="text-muted-foreground text-center max-w-md mb-4">
                  The orphanages don't have coordinate data. Please ensure coordinates are added to display them on the map.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-3xl">
                  {filteredOrphanages.map(orphanage => (
                    <Link 
                      key={orphanage.id} 
                      to={`/donor/orphanages/${orphanage.id}`}
                      className="border p-3 rounded-md hover:bg-slate-50"
                    >
                      <h4 className="font-medium">{orphanage.name}</h4>
                      <p className="text-xs text-muted-foreground">{getLocationDisplay(orphanage)}</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};

export default DonorOrphanages;







