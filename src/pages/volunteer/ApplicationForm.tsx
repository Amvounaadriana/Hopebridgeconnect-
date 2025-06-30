import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, doc, getDoc, updateDoc, addDoc, serverTimestamp } from "firebase/firestore";
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
import { useToast } from "@/hooks/use-toast";
import { CalendarIcon, Clock, MapPin } from "lucide-react";

export default function ApplicationForm() {
  const navigate = useNavigate();
  const { taskId } = useParams();
  const { toast } = useToast();
  const { currentUser, userProfile } = useAuth();
  
  // State
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [task, setTask] = useState<any>(null);
  const [message, setMessage] = useState("");
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  
  // Fetch task details
  useEffect(() => {
    const fetchTask = async () => {
      if (!taskId || !currentUser) {
        navigate("/volunteer/tasks");
        return;
      }
      
      try {
        setLoading(true);
        
        const taskRef = doc(db, "tasks", taskId);
        const taskDoc = await getDoc(taskRef);
        
        if (!taskDoc.exists()) {
          toast({
            title: "Error",
            description: "Task not found",
            variant: "destructive"
          });
          navigate("/volunteer/tasks");
          return;
        }
        
        const taskData = taskDoc.data();
        
        // Check if user is already a volunteer for this task
        const isAlreadyVolunteer = (taskData.volunteers || []).some(
          (v: { id: string }) => v.id === currentUser.uid
        );
        
        if (isAlreadyVolunteer) {
          toast({
            title: "Already Applied",
            description: "You have already applied for this task",
            variant: "destructive"
          });
          navigate("/volunteer/tasks");
          return;
        }
        
        // Check if there are still slots available
        if (taskData.filledSlots >= taskData.slots) {
          toast({
            title: "Task Full",
            description: "This task is already full",
            variant: "destructive"
          });
          navigate("/volunteer/tasks");
          return;
        }
        
        setTask({
          id: taskDoc.id,
          ...taskData
        });
      } catch (error) {
        console.error("Error fetching task:", error);
        toast({
          title: "Error",
          description: "Failed to load task details",
          variant: "destructive"
        });
        navigate("/volunteer/tasks");
      } finally {
        setLoading(false);
      }
    };
    
    fetchTask();
  }, [taskId, currentUser, navigate, toast]);
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser || !userProfile || !task) {
      toast({
        title: "Error",
        description: "You must be logged in to apply",
        variant: "destructive"
      });
      return;
    }
    
    if (!agreeToTerms) {
      toast({
        title: "Terms Required",
        description: "You must agree to the terms and conditions",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setSubmitting(true);
      
      // Add user to volunteers array and increment filledSlots
      await updateDoc(doc(db, "tasks", task.id), {
        volunteers: [
          ...(task.volunteers || []),
          { id: currentUser.uid, name: userProfile.displayName || "Volunteer" }
        ],
        filledSlots: (task.filledSlots || 0) + 1
      });
      
      // Create application record
      await addDoc(collection(db, "applications"), {
        taskId: task.id,
        taskTitle: task.title,
        volunteerId: currentUser.uid,
        volunteerName: userProfile.displayName || "Volunteer",
        message: message,
        status: "approved", // Auto-approve for now
        createdAt: serverTimestamp(),
        orphanageId: task.orphanageId,
        orphanageName: task.orphanageName
      });
      
      toast({
        title: "Application Successful",
        description: "You have successfully applied for this volunteer task"
      });
      
      // Redirect to volunteer dashboard
      navigate("/volunteer/tasks");
    } catch (error) {
      console.error("Error submitting application:", error);
      toast({
        title: "Application Error",
        description: error instanceof Error ? error.message : "Failed to submit application",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };
  
  if (loading) {
    return (
      <div className="container max-w-md mx-auto py-12 flex justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary rounded-full border-t-transparent"></div>
      </div>
    );
  }
  
  if (!task) {
    return (
      <div className="container max-w-md mx-auto py-12">
        <Card>
          <CardHeader>
            <CardTitle>Task Not Found</CardTitle>
            <CardDescription>
              The task you're looking for doesn't exist or is no longer available
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={() => navigate("/volunteer/tasks")} className="w-full">
              View Available Tasks
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="container max-w-lg mx-auto py-12">
      <Card>
        <CardHeader>
          <CardTitle>Apply for Volunteer Task</CardTitle>
          <CardDescription>
            Complete this form to apply for the selected volunteer opportunity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <Card className="bg-muted/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{task.title}</CardTitle>
                <CardDescription>{task.orphanageName}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center text-sm">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    <span>{task.date}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <Clock className="mr-2 h-4 w-4" />
                    <span>{task.startTime} - {task.endTime}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <MapPin className="mr-2 h-4 w-4" />
                    <span>{task.location}</span>
                  </div>
                  <p className="text-sm mt-2">{task.description}</p>
                  <div className="text-sm mt-2">
                    <span className="font-medium">Slots:</span> {task.filledSlots}/{task.slots}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="message">Message (Optional)</Label>
              <Textarea
                id="message"
                placeholder="Tell us why you're interested in this opportunity"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Share any relevant experience or motivation
              </p>
            </div>
            
            <div className="flex items-start space-x-2">
              <Checkbox
                id="terms"
                checked={agreeToTerms}
                onCheckedChange={(checked) => setAgreeToTerms(checked as boolean)}
              />
              <div className="grid gap-1.5 leading-none">
                <Label
                  htmlFor="terms"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  I agree to the volunteer terms and conditions
                </Label>
                <p className="text-sm text-muted-foreground">
                  By checking this box, you agree to follow the orphanage's rules and guidelines
                </p>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/volunteer/tasks")}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Submitting..." : "Submit Application"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}



