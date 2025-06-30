import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { 
  collection, getDocs, query, where, doc, 
  updateDoc, addDoc, serverTimestamp 
} from "firebase/firestore";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { 
  Upload, Loader2, User, Calendar, MapPin, Phone, Mail 
} from "lucide-react";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function VolunteerRegistrationForm() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentUser, userProfile } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [selectedOrphanages, setSelectedOrphanages] = useState<string[]>([]);
  const [orphanages, setOrphanages] = useState<{id: string, name: string}[]>([]);
  const [availableDays, setAvailableDays] = useState<string[]>([]);
  
  const [formData, setFormData] = useState({
    name: userProfile?.displayName || "",
    phone: userProfile?.phoneNumber || "",
    location: userProfile?.location || "",
    bio: userProfile?.bio || "",
    skills: userProfile?.skills || [] as string[],
    emergencyContact: {
      name: "",
      phone: "",
      relation: "",
    },
  });

  useEffect(() => {
    // Check if user is already a volunteer with an active status
    const checkVolunteerStatus = async () => {
      if (!currentUser) return;
      
      try {
        const applicationsRef = collection(db, "volunteerApplications");
        const q = query(
          applicationsRef,
          where("volunteerId", "==", currentUser.uid),
          where("status", "in", ["approved", "pending"])
        );
        
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
          // User already has applications
          const pendingApps = snapshot.docs.filter(doc => doc.data().status === "pending");
          
          if (pendingApps.length > 0) {
            toast({
              title: "Application Pending",
              description: "You already have pending volunteer applications"
            });
            navigate("/volunteer/dashboard");
            return;
          }
          
          const approvedApps = snapshot.docs.filter(doc => doc.data().status === "approved");
          if (approvedApps.length > 0) {
            toast({
              title: "Already Approved",
              description: "You are already an approved volunteer"
            });
            navigate("/volunteer/dashboard");
            return;
          }
        }
      } catch (error) {
        console.error("Error checking volunteer status:", error);
      }
    };
    
    // Fetch orphanages for selection
    const fetchOrphanages = async () => {
      try {
        const orphanagesRef = collection(db, "orphanages");
        const snapshot = await getDocs(orphanagesRef);
        const orphanagesList = snapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name
        }));
        setOrphanages(orphanagesList);
      } catch (error) {
        console.error("Error fetching orphanages:", error);
      }
    };
    
    checkVolunteerStatus();
    fetchOrphanages();
    
    // Set photo preview if user already has a photo
    if (userProfile?.photoURL) {
      setPhotoPreview(userProfile.photoURL);
    }
  }, [currentUser, userProfile, navigate, toast]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleEmergencyContactChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      emergencyContact: {
        ...prev.emergencyContact,
        [name]: value
      }
    }));
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      
      reader.onload = (event) => {
        if (event.target && typeof event.target.result === 'string') {
          setPhotoBase64(event.target.result);
          setPhotoPreview(event.target.result);
        }
      };
      
      reader.readAsDataURL(file);
    }
  };

  const handleDayToggle = (day: string) => {
    setAvailableDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day) 
        : [...prev, day]
    );
  };

  const handleSkillChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    if (value.trim() && !formData.skills.includes(value.trim())) {
      setFormData(prev => ({
        ...prev,
        skills: [...prev.skills, value.trim()]
      }));
      e.target.value = '';
    }
  };

  const removeSkill = (skill: string) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter(s => s !== skill)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser) {
      toast({
        title: "Error",
        description: "You must be logged in to apply",
        variant: "destructive"
      });
      return;
    }
    
    if (selectedOrphanages.length === 0) {
      toast({
        title: "Orphanage Required",
        description: "Please select at least one orphanage",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setLoading(true);
      
      // Update user profile in Firestore
      await updateDoc(doc(db, "users", currentUser.uid), {
        displayName: formData.name,
        phoneNumber: formData.phone,
        location: formData.location,
        bio: formData.bio,
        skills: formData.skills,
        availability: {
          days: availableDays,
        },
        emergencyContact: formData.emergencyContact,
        photoURL: photoBase64 || userProfile?.photoURL,
        role: "volunteer",
        status: "pending",
        updatedAt: serverTimestamp(),
        orphanageIds: selectedOrphanages, // <-- persist selected orphanages
      });
      
      // Create volunteer applications for each selected orphanage
      for (const orphanageId of selectedOrphanages) {
        const orphanage = orphanages.find(o => o.id === orphanageId);
        
        await addDoc(collection(db, "volunteerApplications"), {
          volunteerId: currentUser.uid,
          volunteerName: formData.name,
          volunteerPhoto: photoBase64 || userProfile?.photoURL,
          orphanageId: orphanageId,
          orphanageName: orphanage?.name || "",
          status: "pending",
          message: formData.bio,
          createdAt: serverTimestamp(),
        });
      }
      
      toast({
        title: "Application Submitted",
        description: "Your volunteer application has been submitted for review"
      });
      
      navigate("/volunteer/dashboard");
    } catch (error) {
      console.error("Error submitting application:", error);
      toast({
        title: "Application Error",
        description: error instanceof Error ? error.message : "Failed to submit application",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="container max-w-2xl mx-auto py-12">
      <Card>
        <CardHeader>
          <CardTitle>Volunteer Registration</CardTitle>
          <CardDescription>
            Complete this form to apply as a volunteer
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="photo">Profile Photo</Label>
                <div className="flex items-center space-x-4">
                  {photoPreview && (
                    <div className="h-20 w-20 rounded-full overflow-hidden">
                      <img 
                        src={photoPreview} 
                        alt="Preview" 
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex-1">
                    <Input
                      id="photo"
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                    />
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  name="bio"
                  value={formData.bio}
                  onChange={handleInputChange}
                  placeholder="Tell us about yourself and why you want to volunteer"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="skills">Skills</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.skills.map(skill => (
                    <div key={skill} className="bg-muted px-3 py-1 rounded-full flex items-center">
                      <span>{skill}</span>
                      <button
                        type="button"
                        className="ml-2 text-muted-foreground hover:text-foreground"
                        onClick={() => removeSkill(skill)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                <Input
                  id="skills"
                  placeholder="Type a skill and press Enter"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSkillChange(e as any);
                    }
                  }}
                  onBlur={(e) => handleSkillChange(e)}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Availability</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => (
                    <div key={day} className="flex items-center space-x-2">
                      <Checkbox
                        id={`day-${day}`}
                        checked={availableDays.includes(day)}
                        onCheckedChange={() => handleDayToggle(day)}
                      />
                      <Label htmlFor={`day-${day}`}>{day}</Label>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="orphanages">Select Orphanages</Label>
                <Select 
                  onValueChange={(value) => setSelectedOrphanages([...selectedOrphanages, value])}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an orphanage" />
                  </SelectTrigger>
                  <SelectContent>
                    {orphanages.map((orphanage) => (
                      <SelectItem 
                        key={orphanage.id} 
                        value={orphanage.id}
                        disabled={selectedOrphanages.includes(orphanage.id)}
                      >
                        {orphanage.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {selectedOrphanages.length > 0 && (
                  <div className="mt-2 space-y-2">
                    <Label>Selected Orphanages</Label>
                    <div className="flex flex-wrap gap-2">
                      {selectedOrphanages.map(id => {
                        const orphanage = orphanages.find(o => o.id === id);
                        return (
                          <div key={id} className="bg-muted px-3 py-1 rounded-full flex items-center">
                            <span>{orphanage?.name}</span>
                            <button
                              type="button"
                              className="ml-2 text-muted-foreground hover:text-foreground"
                              onClick={() => setSelectedOrphanages(prev => prev.filter(o => o !== id))}
                            >
                              ×
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <Label>Emergency Contact</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="emergency-name">Name</Label>
                    <Input
                      id="emergency-name"
                      name="name"
                      value={formData.emergencyContact.name}
                      onChange={handleEmergencyContactChange}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="emergency-phone">Phone</Label>
                    <Input
                      id="emergency-phone"
                      name="phone"
                      value={formData.emergencyContact.phone}
                      onChange={handleEmergencyContactChange}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="emergency-relation">Relation</Label>
                    <Input
                      id="emergency-relation"
                      name="relation"
                      value={formData.emergencyContact.relation}
                      onChange={handleEmergencyContactChange}
                      required
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/")}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Application"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

