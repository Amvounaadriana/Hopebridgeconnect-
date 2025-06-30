import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  getCertificatesByVolunteer,
  generateCertificatePDF,
} from "@/services/volunteer/certificates";
import { useAuth } from "@/contexts/AuthContext";
import { Certificate } from "@/types/models";
import { FileDown, Award, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Link } from "react-router-dom";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

const VolunteerCertificates = () => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalHours, setTotalHours] = useState(0);

  useEffect(() => {
    const fetchCertificates = async () => {
      if (!currentUser?.uid) return;

      try {
        setLoading(true);
        const certs = await getCertificatesByVolunteer(currentUser.uid);
        setCertificates(certs);

        const hoursRef = collection(db, "volunteerHours");
        const hoursQuery = query(
          hoursRef,
          where("volunteerId", "==", currentUser.uid)
        );
        const hoursSnapshot = await getDocs(hoursQuery);
        const hours = hoursSnapshot.docs.reduce(
          (total, doc) => total + (doc.data().hours || 0),
          0
        );
        setTotalHours(hours);
      } catch (error) {
        console.error("Error fetching certificates:", error);
        toast({
          title: "Error",
          description:
            "Failed to load your certificates. Please try again later.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchCertificates();
  }, [currentUser?.uid, toast]);

  const handleDownload = async (certificateId: string) => {
    try {
      await generateCertificatePDF(certificateId);
      toast({
        title: "Certificate Downloaded",
        description: "Your certificate has been successfully downloaded.",
      });
    } catch (error) {
      console.error("Error downloading certificate:", error);
      toast({
        title: "Download Failed",
        description: "Failed to download certificate. Please try again.",
        variant: "destructive",
      });
    }
  };

  const certificateThresholds = [10, 25, 50, 100, 250, 500];

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "available":
        return "bg-green-100 text-green-800";
      case "processing":
        return "bg-yellow-100 text-yellow-800";
      case "earned":
      default:
        return "bg-gray-200 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Certificates</h1>
        <p className="text-muted-foreground">
          View and download your volunteer service certificates
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="animate-pulse flex flex-col items-center">
            <div className="h-32 w-32 rounded-full bg-gray-200 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-48"></div>
          </div>
        </div>
      ) : certificates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-10">
            <Award className="h-16 w-16 text-gray-300 mb-4" />
            <h3 className="text-xl font-medium text-center">No Certificates Yet</h3>
            <p className="text-center text-muted-foreground mt-2 max-w-md">
              Complete volunteer tasks and accumulate hours to earn your first certificate.
              Certificates are awarded at 10, 25, 50, 100, 250, and 500 hours of service.
            </p>
            <Button className="mt-6" variant="outline" asChild>
              <Link to="/volunteer/tasks">Browse Available Tasks</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {certificates.map((cert) => (
            <Card key={cert.id} className="overflow-hidden">
              <div className="h-3 bg-hope-500"></div>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{cert.title}</CardTitle>
                    <CardDescription>
                      Issued {cert.issueDate ? new Date(cert.issueDate).toLocaleDateString() : "Pending"}
                    </CardDescription>
                  </div>
                  <div className={`px-2 py-1 text-xs rounded-full font-medium ${getStatusBadgeClass(cert.status)}`}>
                    {cert.status === "available" ? "Ready to download" : cert.status}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm">{cert.description}</p>

                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{cert.hoursCompleted} hours completed</span>
                </div>

                {cert.orphanages && cert.orphanages.length > 0 && (
                  <div>
                    <div className="text-sm font-medium mb-1">Orphanages served:</div>
                    <div className="flex flex-wrap gap-1">
                      {cert.orphanages.map((org, index) => (
                        <span key={index} className="text-xs bg-gray-100 rounded-full px-2 py-1">
                          {org.name || "Unnamed"}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="text-xs text-muted-foreground">{cert.timeframe}</div>
              </CardContent>
              <CardFooter className="border-t pt-4">
                <Button
                  variant={cert.status === "available" ? "default" : "outline"}
                  className="w-full"
                  disabled={cert.status !== "available"}
                  onClick={() => cert.id && handleDownload(cert.id)}
                >
                  <FileDown className="mr-2 h-4 w-4" />
                  {cert.status === "available"
                    ? "Download Certificate"
                    : "Certificate Processing"}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Hour Milestones</CardTitle>
          <CardDescription>
            Certificates are awarded at these volunteer hour thresholds
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <div className="absolute top-0 bottom-0 left-[15px] w-0.5 bg-gray-200"></div>
            <div className="space-y-6">
              {certificateThresholds.map((hours) => {
                const nextThreshold = certificateThresholds.find(t => t > totalHours);
                return (
                  <div key={hours} className="relative flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center z-10 ${
                      hours <= totalHours
                        ? "bg-hope-500 text-white"
                        : "bg-gray-200 text-gray-500"
                    }`}>
                      {hours <= totalHours ? "✓" : null}
                    </div>
                    <div className="ml-4">
                      <h4 className="font-medium">{hours} Hour Certificate</h4>
                      <p className="text-sm text-muted-foreground">
                        {hours <= totalHours
                          ? "Earned"
                          : hours === nextThreshold
                          ? "In progress"
                          : "Not yet earned"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VolunteerCertificates;
