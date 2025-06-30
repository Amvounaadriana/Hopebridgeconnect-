import { useState, useEffect } from "react";
import {
  Card, CardContent, CardHeader, CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/components/ui/use-toast";
import { FileUp, Loader2, Plus, X, Award } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  doc, getDoc, updateDoc, collection, getDocs, query, where
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  getStorage, ref, uploadBytes, getDownloadURL
} from "firebase/storage";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { useNavigate } from "react-router-dom";

interface Orphanage {
  id: string;
  name: string;
  city: string;
}

interface TimeSlot {
  day: string;
  startTime: string;
  endTime: string;
  orphanageId: string;
}

interface ProfileType {
  name: string;
  phone: string;
  location: string;
  photo: string | null;
  bio: string;
  profession: string;
  skills: string[];
  availability: {
    days: string[];
    timeSlots: TimeSlot[];
    preferredOrphanages: string[];
  };
  documents: {
    cv: string | null;
    idCard: string | null;
    certifications: string[];
  };
  totalHours: number;
}

const VolunteerProfile = () => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingCV, setUploadingCV] = useState(false);
  const [orphanages, setOrphanages] = useState<Orphanage[]>([]);
  const [newTimeSlot, setNewTimeSlot] = useState<TimeSlot>({
    day: "monday",
    startTime: "18:00",
    endTime: "20:00",
    orphanageId: ""
  });

  const [profile, setProfile] = useState<ProfileType>({
    name: "",
    phone: "",
    location: "",
    photo: null,
    bio: "",
    profession: "",
    skills: [],
    availability: {
      days: [],
      timeSlots: [],
      preferredOrphanages: []
    },
    documents: {
      cv: null,
      idCard: null,
      certifications: []
    },
    totalHours: 0
  });

  // Fetch orphanages and profile
  useEffect(() => {
    const fetchOrphanages = async () => {
      try {
        const orphanagesSnapshot = await getDocs(collection(db, "orphanages"));
        const orphanagesList: Orphanage[] = [];
        orphanagesSnapshot.forEach(doc => {
          orphanagesList.push({
            id: doc.id,
            name: doc.data().name,
            city: doc.data().city
          });
        });
        setOrphanages(orphanagesList);
      } catch (error) {
        console.error("Error fetching orphanages:", error);
      }
    };

    const fetchProfile = async () => {
      if (!currentUser?.uid) return;
      try {
        setLoading(true);
        await fetchOrphanages();
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setProfile(prev => ({
            ...prev,
            name: userData.displayName || "",
            phone: userData.phoneNumber || "",
            location: userData.location || "",
            photo: userData.photoURL || null,
            bio: userData.bio || "",
            profession: userData.profession || "",
            skills: userData.skills || [],
            availability: {
              days: userData.availability?.days || [],
              timeSlots: userData.availability?.timeSlots || [],
              preferredOrphanages: userData.availability?.preferredOrphanages || []
            },
            documents: userData.documents || {
              cv: null,
              idCard: null,
              certifications: []
            },
            totalHours: 0 // will be set below
          }));

          // Fetch volunteer hours from volunteerHours collection
          if (userData.displayName) {
            const hoursQuery = query(
              collection(db, "volunteerHours"),
              where("volunteerName", "==", userData.displayName)
            );
            const hoursSnapshot = await getDocs(hoursQuery);
            let total = 0;
            hoursSnapshot.forEach(doc => {
              const data = doc.data();
              if (typeof data.hours === "number") total += data.hours;
            });
            setProfile(prev => ({
              ...prev,
              totalHours: total
            }));
          }
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load profile data",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
    // eslint-disable-next-line
  }, [currentUser?.uid]);

  // Input handlers
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const handleSkillChange = (skill: string) => {
    setProfile(prev => {
      const skills = [...prev.skills];
      if (skills.includes(skill)) {
        return { ...prev, skills: skills.filter(s => s !== skill) };
      } else {
        return { ...prev, skills: [...skills, skill] };
      }
    });
  };

  const handleOrphanageChange = (orphanageId: string) => {
    setProfile(prev => {
      const preferredOrphanages = [...prev.availability.preferredOrphanages];
      if (preferredOrphanages.includes(orphanageId)) {
        return {
          ...prev,
          availability: {
            ...prev.availability,
            preferredOrphanages: preferredOrphanages.filter(id => id !== orphanageId)
          }
        };
      } else {
        return {
          ...prev,
          availability: {
            ...prev.availability,
            preferredOrphanages: [...preferredOrphanages, orphanageId]
          }
        };
      }
    });
  };

  const handleNewTimeSlotChange = (field: keyof TimeSlot, value: string) => {
    setNewTimeSlot(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addTimeSlot = () => {
    if (!newTimeSlot.orphanageId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select an orphanage for this time slot",
      });
      return;
    }
    // Validate time range
    const startParts = newTimeSlot.startTime.split(':');
    const endParts = newTimeSlot.endTime.split(':');
    const startMinutes = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);
    const endMinutes = parseInt(endParts[0]) * 60 + parseInt(endParts[1]);
    if (startMinutes >= endMinutes) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "End time must be after start time",
      });
      return;
    }
    setProfile(prev => ({
      ...prev,
      availability: {
        ...prev.availability,
        timeSlots: [...prev.availability.timeSlots, newTimeSlot]
      }
    }));
    setNewTimeSlot({
      day: "monday",
      startTime: "18:00",
      endTime: "20:00",
      orphanageId: ""
    });
    toast({
      title: "Time Slot Added",
      description: "Your availability has been updated",
    });
  };

  const removeTimeSlot = (index: number) => {
    setProfile(prev => ({
      ...prev,
      availability: {
        ...prev.availability,
        timeSlots: prev.availability.timeSlots.filter((_, i) => i !== index)
      }
    }));
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentUser?.uid) return;
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingPhoto(true);
      const storage = getStorage();
      const storageRef = ref(storage, `users/${currentUser.uid}/profile.jpg`);
      await uploadBytes(storageRef, file);
      const photoURL = await getDownloadURL(storageRef);
      setProfile(prev => ({ ...prev, photo: photoURL }));
      toast({
        title: "Photo Uploaded",
        description: "Your profile photo has been updated",
      });
    } catch (error) {
      console.error("Error uploading photo:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to upload profile photo",
      });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleCVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentUser?.uid) return;
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingCV(true);
      const storage = getStorage();
      const storageRef = ref(storage, `users/${currentUser.uid}/cv.pdf`);
      await uploadBytes(storageRef, file);
      const cvURL = await getDownloadURL(storageRef);
      setProfile(prev => ({
        ...prev,
        documents: {
          ...prev.documents,
          cv: cvURL
        }
      }));
      toast({
        title: "CV Uploaded",
        description: "Your CV has been uploaded successfully",
      });
    } catch (error) {
      console.error("Error uploading CV:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to upload CV",
      });
    } finally {
      setUploadingCV(false);
    }
  };

  const handleSave = async () => {
    if (!currentUser?.uid) return;
    try {
      setSaving(true);
      const userRef = doc(db, "users", currentUser.uid);
      await updateDoc(userRef, {
        displayName: profile.name,
        phoneNumber: profile.phone,
        location: profile.location,
        photoURL: profile.photo,
        bio: profile.bio,
        profession: profile.profession,
        skills: profile.skills,
        availability: profile.availability,
        documents: profile.documents
      });
      setIsEditing(false);
      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
      });
      // Optionally, re-fetch volunteer hours if name changed
      if (profile.name) {
        const hoursQuery = query(
          collection(db, "volunteerHours"),
          where("volunteerName", "==", profile.name)
        );
        const hoursSnapshot = await getDocs(hoursQuery);
        let total = 0;
        hoursSnapshot.forEach(doc => {
          const data = doc.data();
          if (typeof data.hours === "number") total += data.hours;
        });
        setProfile(prev => ({
          ...prev,
          totalHours: total
        }));
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update profile",
      });
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return "V";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  const getOrphanageName = (orphanageId: string) => {
    const orphanage = orphanages.find(o => o.id === orphanageId);
    return orphanage ? orphanage.name : "Unknown Orphanage";
  };

  const formatTime = (time: string) => {
    if (!time) return "";
    try {
      const [hours, minutes] = time.split(":");
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? "PM" : "AM";
      const formattedHour = hour % 12 || 12;
      return `${formattedHour}:${minutes} ${ampm}`;
    } catch (e) {
      return time;
    }
  };

  const navigateToCertificates = () => {
    navigate('/volunteer/certificates');
  };

  const handleAvailabilityDayChange = (day: string) => {
    setProfile(prev => {
      const days = [...prev.availability.days];
      if (days.includes(day)) {
        return {
          ...prev,
          availability: {
            ...prev.availability,
            days: days.filter(d => d !== day)
          }
        };
      } else {
        return {
          ...prev,
          availability: {
            ...prev.availability,
            days: [...days, day]
          }
        };
      }
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">My Profile</h1>
        <Button
          onClick={() => isEditing ? handleSave() : setIsEditing(true)}
          disabled={saving}
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : isEditing ? "Save Changes" : "Edit Profile"}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <div className="mb-6 relative">
              <Avatar className="h-24 w-24">
                <AvatarImage src={profile.photo || undefined} alt={profile.name} />
                <AvatarFallback className="text-lg">{getInitials(profile.name)}</AvatarFallback>
              </Avatar>
              {isEditing && (
                <div className="absolute -bottom-2 -right-2">
                  <input
                    type="file"
                    id="photo-upload"
                    className="hidden"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    disabled={uploadingPhoto}
                  />
                  <label htmlFor="photo-upload">
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full w-8 h-8 p-0"
                      disabled={uploadingPhoto}
                      asChild
                    >
                      <div>
                        {uploadingPhoto ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <FileUp className="h-4 w-4" />
                        )}
                      </div>
                    </Button>
                  </label>
                </div>
              )}
            </div>

            <div className="space-y-4 w-full">
              <div>
                <Label htmlFor="name">Full Name</Label>
                {isEditing ? (
                  <Input
                    id="name"
                    name="name"
                    value={profile.name}
                    onChange={handleInputChange}
                    className="mt-1"
                  />
                ) : (
                  <p className="text-sm mt-1">{profile.name}</p>
                )}
              </div>

              <div>
                <Label htmlFor="profession">Profession</Label>
                {isEditing ? (
                  <Input
                    id="profession"
                    name="profession"
                    value={profile.profession}
                    onChange={handleInputChange}
                    className="mt-1"
                  />
                ) : (
                  <p className="text-sm mt-1">{profile.profession || "Not specified"}</p>
                )}
              </div>

              <div>
                <Label htmlFor="phone">Phone Number</Label>
                {isEditing ? (
                  <Input
                    id="phone"
                    name="phone"
                    value={profile.phone}
                    onChange={handleInputChange}
                    className="mt-1"
                  />
                ) : (
                  <p className="text-sm mt-1">{profile.phone || "Not specified"}</p>
                )}
              </div>

              <div>
                <Label htmlFor="location">Location</Label>
                {isEditing ? (
                  <Input
                    id="location"
                    name="location"
                    value={profile.location}
                    onChange={handleInputChange}
                    className="mt-1"
                  />
                ) : (
                  <p className="text-sm mt-1">{profile.location || "Not specified"}</p>
                )}
              </div>

              <div>
                <Label htmlFor="bio">Bio</Label>
                {isEditing ? (
                  <Textarea
                    id="bio"
                    name="bio"
                    value={profile.bio}
                    onChange={handleInputChange}
                    className="mt-1"
                    rows={4}
                  />
                ) : (
                  <p className="text-sm mt-1">{profile.bio || "No bio provided"}</p>
                )}
              </div>

              {isEditing && (
                <div>
                  <Label htmlFor="cv">CV/Resume</Label>
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="file"
                      id="cv-upload"
                      className="hidden"
                      accept=".pdf,.doc,.docx"
                      onChange={handleCVUpload}
                      disabled={uploadingCV}
                    />
                    <label htmlFor="cv-upload" className="w-full">
                      <Button variant="outline" className="w-full" asChild disabled={uploadingCV}>
                        <div>
                          {uploadingCV ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            <>
                              <FileUp className="mr-2 h-4 w-4" /> Upload CV
                            </>
                          )}
                        </div>
                      </Button>
                    </label>
                    {profile.documents.cv && (
                      <span className="text-sm text-muted-foreground">
                        CV uploaded
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Volunteer Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-2">Skills</h3>
                {isEditing ? (
                  <div className="grid grid-cols-2 gap-2">
                    {["teaching", "childcare", "medical", "sports", "music", "arts", "mentoring", "counseling", "cooking", "languages", "technology", "first-aid"].map((skill) => (
                      <div key={skill} className="flex items-center space-x-2">
                        <Checkbox
                          id={`skill-${skill}`}
                          checked={profile.skills.includes(skill)}
                          onCheckedChange={() => handleSkillChange(skill)}
                        />
                        <label
                          htmlFor={`skill-${skill}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {skill.charAt(0).toUpperCase() + skill.slice(1)}
                        </label>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {profile.skills.length > 0 ? (
                      profile.skills.map((skill) => (
                        <span
                          key={skill}
                          className="bg-muted text-muted-foreground px-2 py-1 rounded-md text-sm"
                        >
                          {skill.charAt(0).toUpperCase() + skill.slice(1)}
                        </span>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No skills specified</p>
                    )}
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2">Availability</h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2">Days</h4>
                    {isEditing ? (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].map((day) => (
                          <div key={day} className="flex items-center space-x-2">
                            <Checkbox
                              id={`day-${day}`}
                              checked={profile.availability.days.includes(day)}
                              onCheckedChange={() => handleAvailabilityDayChange(day)}
                            />
                            <label
                              htmlFor={`day-${day}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              {day.charAt(0).toUpperCase() + day.slice(1)}
                            </label>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {profile.availability.days.length > 0 ? (
                          profile.availability.days.map((day) => (
                            <span
                              key={day}
                              className="bg-muted text-muted-foreground px-2 py-1 rounded-md text-sm"
                            >
                              {day.charAt(0).toUpperCase() + day.slice(1)}
                            </span>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground">No days specified</p>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <h4 className="text-sm font-medium mb-2">Time Slots</h4>
                    {isEditing ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 gap-4 p-4 border rounded-md">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <div>
                              <Label htmlFor="day-select">Day</Label>
                              <Select
                                value={newTimeSlot.day}
                                onValueChange={(value) => handleNewTimeSlotChange('day', value)}
                              >
                                <SelectTrigger id="day-select">
                                  <SelectValue placeholder="Select day" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="monday">Monday</SelectItem>
                                  <SelectItem value="tuesday">Tuesday</SelectItem>
                                  <SelectItem value="wednesday">Wednesday</SelectItem>
                                  <SelectItem value="thursday">Thursday</SelectItem>
                                  <SelectItem value="friday">Friday</SelectItem>
                                  <SelectItem value="saturday">Saturday</SelectItem>
                                  <SelectItem value="sunday">Sunday</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div>
                              <Label htmlFor="start-time">Start Time</Label>
                              <Input
                                id="start-time"
                                type="time"
                                value={newTimeSlot.startTime}
                                onChange={(e) => handleNewTimeSlotChange('startTime', e.target.value)}
                              />
                            </div>

                            <div>
                              <Label htmlFor="end-time">End Time</Label>
                              <Input
                                id="end-time"
                                type="time"
                                value={newTimeSlot.endTime}
                                onChange={(e) => handleNewTimeSlotChange('endTime', e.target.value)}
                              />
                            </div>

                            <div>
                              <Label htmlFor="orphanage-select">Orphanage</Label>
                              <Select
                                value={newTimeSlot.orphanageId}
                                onValueChange={(value) => handleNewTimeSlotChange('orphanageId', value)}
                              >
                                <SelectTrigger id="orphanage-select">
                                  <SelectValue placeholder="Select orphanage" />
                                </SelectTrigger>
                                <SelectContent>
                                  {orphanages.map((orphanage) => (
                                    <SelectItem key={orphanage.id} value={orphanage.id}>
                                      {orphanage.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <Button
                            onClick={addTimeSlot}
                            className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90"
                            disabled={!newTimeSlot.orphanageId}
                          >
                            <Plus className="h-4 w-4" /> Add Time Slot
                          </Button>
                        </div>

                        {profile.availability.timeSlots.length > 0 && (
                          <div className="space-y-2">
                            <h5 className="text-sm font-medium">Added Time Slots:</h5>
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                              {profile.availability.timeSlots.map((slot, index) => (
                                <div
                                  key={index}
                                  className="flex items-center justify-between p-3 border rounded-md bg-muted/30"
                                >
                                  <div>
                                    <span className="font-medium">
                                      {slot.day.charAt(0).toUpperCase() + slot.day.slice(1)}
                                    </span>
                                    <span className="mx-2">•</span>
                                    <span>{formatTime(slot.startTime)} - {formatTime(slot.endTime)}</span>
                                    <span className="mx-2">•</span>
                                    <span className="text-sm text-muted-foreground">
                                      {getOrphanageName(slot.orphanageId)}
                                    </span>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeTimeSlot(index)}
                                    className="text-destructive hover:text-destructive/90"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {profile.availability.timeSlots.length > 0 ? (
                          profile.availability.timeSlots.map((slot, index) => (
                            <div
                              key={index}
                              className="p-3 border rounded-md bg-muted/30"
                            >
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-medium">
                                  {slot.day.charAt(0).toUpperCase() + slot.day.slice(1)}
                                </span>
                                <span>•</span>
                                <span>{formatTime(slot.startTime)} - {formatTime(slot.endTime)}</span>
                                <span>•</span>
                                <span className="text-sm text-muted-foreground">
                                  {getOrphanageName(slot.orphanageId)}
                                </span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground">No time slots specified</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2">Volunteer Stats</h3>
                <div className="bg-blue-50 p-4 rounded-md text-center">
                  <div className="text-4xl font-bold text-blue-600">{profile.totalHours}</div>
                  <div className="text-sm text-blue-600">hours</div>
                </div>

                <div className="mt-4 text-center">
                  <Button
                    variant="outline"
                    onClick={navigateToCertificates}
                    className="w-full"
                  >
                    <Award className="h-4 w-4 mr-2" /> View Certificates
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VolunteerProfile;
// ...end of file...