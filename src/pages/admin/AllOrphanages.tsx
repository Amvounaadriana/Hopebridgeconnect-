
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import { Search, MapPin } from "lucide-react";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { getOrphanages } from "@/services/orphanage-service";
import { useToast } from "@/components/ui/use-toast";
import { Orphanage } from "@/types/models";

const AdminAllOrphanages = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [orphanages, setOrphanages] = useState<Orphanage[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Fetch all orphanages data
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

  // Filter orphanages based on search query
  const filteredOrphanages = orphanages.filter(orphanage => 
    orphanage.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (orphanage.city && orphanage.city.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Helper function to display location
  const getLocationDisplay = (orphanage: Orphanage): string => {
    if (orphanage.city && orphanage.country) {
      return `${orphanage.city}, ${orphanage.country}`;
    }
    return orphanage.city || orphanage.country || "Location not specified";
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">All Orphanages</h1>
        <Button asChild>
          <Link to="/admin/orphanage">Manage Your Orphanage</Link>
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Search orphanages by name or location..."
          className="pl-10"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((_, index) => (
            <Card key={index} className="h-full overflow-hidden">
              <div className="h-48 bg-slate-200 animate-pulse"></div>
              <CardContent className="p-4">
                <div className="h-6 w-2/3 bg-slate-200 animate-pulse mb-2"></div>
                <div className="h-4 w-1/2 bg-slate-200 animate-pulse mb-4"></div>
                <div className="h-12 bg-slate-200 animate-pulse"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredOrphanages.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOrphanages.map(orphanage => (
            <Card key={orphanage.id} className="h-full overflow-hidden hover:shadow-md transition-shadow">
              <AspectRatio ratio={16 / 9}>
                <img 
                  src={orphanage.photo || "/placeholder.svg"} 
                  alt={orphanage.name}
                  className="w-full h-full object-cover"
                />
              </AspectRatio>
              <CardContent className="p-4">
                <h3 className="font-semibold text-lg">{orphanage.name}</h3>
                <div className="flex items-center gap-1 text-muted-foreground mb-2">
                  <MapPin className="h-3 w-3" />
                  <span className="text-sm">{getLocationDisplay(orphanage)}</span>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {orphanage.description || "No description provided."}
                </p>
                <div className="mt-4">
                  <Button size="sm" variant="outline" asChild className="w-full">
                    <Link to={`/donor/orphanages/${orphanage.id}`}>
                      View Details
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">No orphanages found matching your search</p>
        </div>
      )}
    </div>
  );
};

export default AdminAllOrphanages;
