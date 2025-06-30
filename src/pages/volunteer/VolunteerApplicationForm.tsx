import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { collection, getDocs, addDoc, serverTimestamp, query, where } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { createNotification } from "@/services/notification-service";
import { getOrphanageById } from "@/services/orphanage-service";
import { sendResendEmail } from "@/services/resend";

const RESEND_API_KEY = "re_8tso84pS_Ezpb4pbf3kzAL1fbTX1N2Cz9";

const VolunteerApplicationForm = () => {
  const { currentUser, userProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [orphanages, setOrphanages] = useState<any[]>([]);
  const [form, setForm] = useState({
    fullName: userProfile?.displayName || "",
    phone: userProfile?.phoneNumber || "",
    location: userProfile?.location || "",
    profession: "",
    bio: "",
    skills: [] as string[],
    orphanageId: "",
    cv: null as File | null,
    idCard: null as File | null,
  });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    // Fetch orphanages for selection
    const fetchOrphanages = async () => {
      const snap = await getDocs(collection(db, "orphanages"));
      setOrphanages(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchOrphanages();
  }, []);

  // Change the type of handleChange to accept HTMLSelectElement as well
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, files } = e.target;
    if (files && files[0]) {
      setForm(f => ({ ...f, [name]: files[0] }));
    }
  };

  const handleSkillChange = (skill: string) => {
    setForm(f => {
      const skills = [...f.skills];
      if (skills.includes(skill)) {
        return { ...f, skills: skills.filter(s => s !== skill) };
      } else {
        return { ...f, skills: [...skills, skill] };
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    try {
      // Upload files to Firebase Storage
      const storage = getStorage();
      let cvUrl = null;
      let idCardUrl = null;
      if (form.cv) {
        const cvRef = ref(storage, `volunteerApplications/${currentUser?.uid}/cv.pdf`);
        await uploadBytes(cvRef, form.cv);
        cvUrl = await getDownloadURL(cvRef);
      }
      if (form.idCard) {
        const idRef = ref(storage, `volunteerApplications/${currentUser?.uid}/idCard.pdf`);
        await uploadBytes(idRef, form.idCard);
        idCardUrl = await getDownloadURL(idRef);
      }
      // Save application to Firestore
      const appRef = await addDoc(collection(db, "volunteerApplications"), {
        userId: currentUser?.uid,
        fullName: form.fullName,
        phone: form.phone,
        location: form.location,
        profession: form.profession,
        bio: form.bio,
        skills: form.skills,
        orphanageId: form.orphanageId,
        cv: cvUrl,
        idCard: idCardUrl,
        status: "pending",
        createdAt: serverTimestamp(),
      });

      // Send confirmation email to volunteer
      if (currentUser?.email) {
        await sendResendEmail({
          to: currentUser.email,
          subject: "Volunteer Application Submitted - HopeBridge Connect",
          html: `<p>Dear ${form.fullName},</p><p>Your volunteer application has been received and is under review. We will contact you soon.</p>`
        });
        // Send verification email if not verified
        if (!currentUser.emailVerified) {
          await sendResendEmail({
            to: currentUser.email,
            subject: "Verify Your Email - HopeBridge Connect",
            html: `<p>Dear ${form.fullName},</p><p>Please verify your email address by clicking the link below:</p><p><a href='#'>Verify Email</a></p>`
          });
        }
      }

      // Notify orphanage admins (in-app and email)
      if (form.orphanageId) {
        const orphanage = await getOrphanageById(form.orphanageId);
        // Find all users with role 'admin' and orphanageId
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("role", "==", "admin"), where("orphanageName", "==", orphanage.name));
        const adminSnap = await getDocs(q);
        for (const adminDoc of adminSnap.docs) {
          const admin = adminDoc.data();
          // In-app notification
          await createNotification(
            admin.uid,
            "New Volunteer Application",
            `A new volunteer application has been submitted for ${orphanage.name}.`,
            "volunteer",
            appRef.id
          );
          // Email notification
          if (admin.email) {
            await sendResendEmail({
              to: admin.email,
              subject: `New Volunteer Application for ${orphanage.name}`,
              html: `<p>Dear ${admin.displayName || "Admin"},</p><p>A new volunteer application has been submitted for <b>${orphanage.name}</b>.<br/>Please <a href="${window.location.origin}/admin/volunteer-applications">review the application</a>.</p>`
            });
          }
        }
      }
      toast({ title: "Application Submitted!", description: "Your application has been sent for review." });
      navigate("/welcome");
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to submit application." });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Volunteer Application</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input name="fullName" value={form.fullName} onChange={handleChange} placeholder="Full Name" required />
            <Input name="phone" value={form.phone} onChange={handleChange} placeholder="Phone Number" required />
            <Input name="location" value={form.location} onChange={handleChange} placeholder="Location" required />
            <Input name="profession" value={form.profession} onChange={handleChange} placeholder="Profession" />
            <textarea name="bio" value={form.bio} onChange={handleChange} placeholder="Bio" className="w-full border rounded p-2" rows={3} />
            <div>
              <label className="block mb-1 font-medium">Skills</label>
              <div className="flex flex-wrap gap-2">
                {["teaching","childcare","medical","sports","music","arts","mentoring","counseling","cooking","languages","technology","first-aid"].map(skill => (
                  <label key={skill} className="flex items-center gap-1">
                    <input type="checkbox" checked={form.skills.includes(skill)} onChange={() => handleSkillChange(skill)} />
                    <span>{skill}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block mb-1 font-medium">Select Orphanage</label>
              <select
                name="orphanageId"
                value={form.orphanageId}
                onChange={handleChange}
                className="w-full border rounded p-2"
                required
              >
                <option value="">Select an orphanage</option>
                {orphanages.map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block mb-1 font-medium">Upload CV (PDF)</label>
              <Input type="file" name="cv" accept="application/pdf" onChange={handleFileChange} />
            </div>
            <div>
              <label className="block mb-1 font-medium">Upload ID Card (PDF)</label>
              <Input type="file" name="idCard" accept="application/pdf" onChange={handleFileChange} />
            </div>
            <Button type="submit" className="w-full" disabled={uploading}>
              {uploading ? "Submitting..." : "Submit Application"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default VolunteerApplicationForm;