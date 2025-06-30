import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { Loader2, Plus, X } from "lucide-react";

const SKILL_OPTIONS = [
  "Teaching",
  "Childcare",
  "Cooking",
  "Medical",
  "Counseling",
  "Sports",
  "Music",
  "Art",
  "Tutoring",
  "Administration",
  "IT Support",
  "Fundraising",
  "Event Planning",
  "Photography",
  "Maintenance",
];

const DAY_OPTIONS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const AddVolunteer = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [customSkill, setCustomSkill] = useState("");
  
  const [formData, setFormData] = useState({
    email: "",
    name: "",
    phone: "",
    location: "",
    bio: "",
    skills: [] as string[],
    availableDays: [] as string[],
    emergencyContact: {
      name: "",
      phone: "",
      relation: "",
    },
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEmergencyContactChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      emergencyContact: {
        ...prev.emergencyContact,
        [name]: value,
      },
    }));
  };

  const handleSkillToggle = (skill: string) => {
    setFormData((prev) => {
      const skills = prev.skills.includes(skill)
        ? prev.skills.filter((s) => s !== skill)
        : [...prev.skills, skill];
      return { ...prev, skills };
    });
  };

  const handleAddCustomSkill = () => {
    if (customSkill.trim() && !formData.skills.includes(customSkill.trim())) {
      setFormData((prev) => ({
        ...prev,
        skills: [...prev.skills, customSkill.trim()],
      }));
      setCustomSkill("");
    }
  };

  const handleDayToggle = (day: string) => {
    setFormData((prev) => {
      const days = prev.availableDays.includes(day)
        ? prev.availableDays.filter((d) => d !== day)
        : [...prev.availableDays, day];
      return { ...prev, availableDays: days };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userProfile?.orphanageId) {
      toast({
        title: "Error",
        description: "You must be associated with an orphanage to add volunteers",
        variant: "destructive",
      });
      return;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setLoading(true);
      
      // Create a new volunteer document
      const volunteerData = {
        email: formData.email,
        displayName: formData.name,
        phoneNumber: formData.phone,
        location: formData.location,
        bio: formData.bio,
        skills: formData.skills,
        availability: {
          days: formData.availableDays,
        },
        emergencyContact: formData.emergencyContact,
        orphanageId: userProfile.orphanageId,
        orphanageName: userProfile.orphanageName || "",
        role: "volunteer",
        status: "pending",
        joinDate: serverTimestamp(),
        totalHours: 0,
        createdBy: userProfile.uid,
        createdAt: serverTimestamp(),
      };
      
      // Add to volunteers collection
      await addDoc(collection(db, "volunteers"), volunteerData);
      
      toast({
        title: "Success!",
        description: `Volunteer ${formData.name} has been added`,
      });
      
      navigate("/admin/volunteers");
    } catch (error: any) {
      console.error("Error adding volunteer:", error);
      toast({
        variant: "destructive",
        title: "Failed to add volunteer",
        description: error.message || "An unexpected error occurred",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Add New Volunteer</h1>
        <Button variant="outline" onClick={() => navigate("/admin/volunteers")}>
          Back to Volunteers
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Volunteer Information</CardTitle>
          <CardDescription>
            Add a new volunteer to your orphanage
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              </div>
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
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                name="bio"
                value={formData.bio}
                onChange={handleInputChange}
                placeholder="Tell us about the volunteer..."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label>Skills</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {SKILL_OPTIONS.map((skill) => (
                  <div key={skill} className="flex items-center space-x-2">
                    <Checkbox
                      id={`skill-${skill}`}
                      checked={formData.skills.includes(skill)}
                      onCheckedChange={() => handleSkillToggle(skill)}
                    />
                    <label
                      htmlFor={`skill-${skill}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {skill}
                    </label>
                  </div>
                ))}
              </div>
              <div className="flex mt-2">
                <Input
                  placeholder="Add custom skill"
                  value={customSkill}
                  onChange={(e) => setCustomSkill(e.target.value)}
                  className="mr-2"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddCustomSkill}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {formData.skills.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.skills.map((skill) => (
                    <div
                      key={skill}
                      className="bg-secondary text-secondary-foreground px-3 py-1 rounded-full text-sm flex items-center"
                    >
                      {skill}
                      <button
                        type="button"
                        onClick={() => handleSkillToggle(skill)}
                        className="ml-2 text-secondary-foreground/70 hover:text-secondary-foreground"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Availability</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {DAY_OPTIONS.map((day) => (
                  <div key={day} className="flex items-center space-x-2">
                    <Checkbox
                      id={`day-${day}`}
                      checked={formData.availableDays.includes(day)}
                      onCheckedChange={() => handleDayToggle(day)}
                    />
                    <label
                      htmlFor={`day-${day}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {day}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Emergency Contact</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="emergency-name">Name</Label>
                  <Input
                    id="emergency-name"
                    name="name"
                    value={formData.emergencyContact.name}
                    onChange={handleEmergencyContactChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergency-phone">Phone</Label>
                  <Input
                    id="emergency-phone"
                    name="phone"
                    value={formData.emergencyContact.phone}
                    onChange={handleEmergencyContactChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergency-relation">Relation</Label>
                  <Input
                    id="emergency-relation"
                    name="relation"
                    value={formData.emergencyContact.relation}
                    onChange={handleEmergencyContactChange}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/admin/volunteers")}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  "Add Volunteer"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AddVolunteer;