
import React, { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc, updateDoc } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";

// Define interfaces
interface Volunteer {
  id: string;
  name: string;
  photo: string | null;
  attendance?: string;
}

interface Task {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  category: string;
  status: string;
  orphanageId: string;
  orphanageName: string;
  volunteers: Volunteer[];
}

interface Orphanage {
  id: string;
  name: string;
}

const VolunteerCalendar = () => {
  const [date, setDate] = useState<Date>(new Date());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [userOrphanage, setUserOrphanage] = useState<Orphanage | null>(null);
  const { toast } = useToast();
  const { currentUser, userProfile } = useAuth();

  // Fetch user's orphanage and related data
  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser?.uid) return;
      
      try {
        setLoading(true);
        
        // First try to get the orphanageId from userProfile
        let orphId = userProfile?.orphanageId;
        let orphName = "";
        
        // If not found in userProfile, try to get it from the user document
        if (!orphId) {
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            orphId = userData.orphanageId;
          }
        }
        
        // If still not found, try to get the orphanage by adminId
        if (!orphId) {
          const orphanagesRef = collection(db, "orphanages");
          const q = query(orphanagesRef, where("adminId", "==", currentUser.uid));
          const orphanagesSnapshot = await getDocs(q);
          
          if (!orphanagesSnapshot.empty) {
            const orphDoc = orphanagesSnapshot.docs[0];
            orphId = orphDoc.id;
            orphName = orphDoc.data().name || "My Orphanage";
          }
        }
        
        if (!orphId) {
          toast({
            title: "No Orphanage Found",
            description: "You need to create or be assigned to an orphanage first.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
        
        // If we have an orphId but no name yet, fetch the orphanage details
        if (orphId && !orphName) {
          const orphDoc = await getDoc(doc(db, "orphanages", orphId));
          if (orphDoc.exists()) {
            orphName = orphDoc.data().name || "My Orphanage";
          }
        }
        
        // Set the user's orphanage
        setUserOrphanage({
          id: orphId,
          name: orphName
        });
        
        // Fetch volunteers for this orphanage
        const volunteersRef = collection(db, "users");
        const volunteersQuery = query(
          volunteersRef,
          where("role", "==", "volunteer"),
          where("orphanageId", "==", orphId)
        );
        
        const volunteersSnapshot = await getDocs(volunteersQuery);
        const volunteersData: Volunteer[] = [];
        
        volunteersSnapshot.forEach((doc) => {
          const data = doc.data();
          volunteersData.push({
            id: doc.id,
            name: data.displayName || "Unknown Volunteer",
            photo: data.photoURL || null,
          });
        });
        
        setVolunteers(volunteersData);
        
        // Fetch tasks for this orphanage
        const tasksRef = collection(db, "tasks");
        const tasksQuery = query(
          tasksRef,
          where("orphanageId", "==", orphId)
        );
        
        const tasksSnapshot = await getDocs(tasksQuery);
        const tasksData: Task[] = [];
        
        tasksSnapshot.forEach((doc) => {
          const data = doc.data();
          tasksData.push({
            id: doc.id,
            title: data.title || "Untitled Task",
            date: data.date || "",
            startTime: data.startTime || "",
            endTime: data.endTime || "",
            location: data.location || "",
            category: data.category || "other",
            status: data.status || "upcoming",
            orphanageId: data.orphanageId || "",
            orphanageName: data.orphanageName || orphName,
            volunteers: Array.isArray(data.volunteers) ? data.volunteers : [],
          });
        });
        
        setTasks(tasksData);
      } catch (error) {
        console.error("Error fetching calendar data:", error);
        toast({
          title: "Error",
          description: "Failed to load calendar data. Please try again.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [currentUser, userProfile, toast]);

  // Filter tasks based on selected date and filters
  const filteredTasks = tasks.filter(task => {
    const matchesDate = task.date === format(date, "yyyy-MM-dd");
    const matchesCategory = categoryFilter === "all" || task.category === categoryFilter;
    const matchesStatus = statusFilter === "all" || task.status === statusFilter;
    
    return matchesDate && matchesCategory && matchesStatus;
  });

  // Get all unique categories from tasks
  const categories = Array.from(new Set(tasks.map(task => task.category))).filter(Boolean);

  // Navigate to previous month
  const goToPreviousMonth = () => {
    const prevMonth = new Date(date);
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    setDate(prevMonth);
  };
  
  // Navigate to next month
  const goToNextMonth = () => {
    const nextMonth = new Date(date);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    setDate(nextMonth);
  };
  
  // Check if a date has tasks
  const hasTasksOnDate = (day: Date) => {
    return tasks.some(task => 
      task.date === format(day, "yyyy-MM-dd")
    );
  };
  
  // Mark attendance
  const markAttendance = async (taskId: string, volunteerId: string, status: string) => {
    try {
      // Update the task with attendance information
      const taskRef = doc(db, "tasks", taskId);
      const taskDoc = await getDoc(taskRef);
      
      if (taskDoc.exists()) {
        const taskData = taskDoc.data();
        const volunteers = taskData.volunteers || [];
        
        // Update the volunteer's attendance status
        const updatedVolunteers = volunteers.map(vol => {
          if (vol.id === volunteerId) {
            return {
              ...vol,
              attendance: status,
              attendanceMarkedAt: new Date().toISOString()
            };
          }
          return vol;
        });
        
        await updateDoc(taskRef, {
          volunteers: updatedVolunteers
        });
        
        // Update local state
        setTasks(prevTasks => 
          prevTasks.map(task => {
            if (task.id === taskId) {
              return {
                ...task,
                volunteers: updatedVolunteers
              };
            }
            return task;
          })
        );
        
        toast({
          title: "Attendance Marked",
          description: `Volunteer marked as ${status}`
        });
      }
    } catch (error) {
      console.error("Error marking attendance:", error);
      toast({
        title: "Error",
        description: "Failed to mark attendance. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Get initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Volunteer Calendar</h1>
      
      <div className="mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Filter Options</CardTitle>
            <CardDescription>Customize your calendar view</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Orphanage</label>
                <Select disabled value={userOrphanage?.id || ""}>
                  <SelectTrigger>
                    <SelectValue placeholder={userOrphanage?.name || "Loading..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {userOrphanage && (
                      <SelectItem value={userOrphanage.id}>
                        {userOrphanage.name}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  You can only view your own orphanage
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map(category => (
                      <SelectItem key={category} value={category}>
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex justify-end mt-4">
              <div className="flex space-x-2">
                <Button variant="outline" onClick={() => {
                  setCategoryFilter("all");
                  setStatusFilter("all");
                }}>
                  Reset Filters
                </Button>
                <Button onClick={() => {
                  // Apply filters logic if needed
                }}>
                  Apply Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Calendar Column */}
        <div className="md:col-span-1">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle>
                  {format(date, "MMMM yyyy")}
                </CardTitle>
                <div className="flex items-center space-x-2">
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={goToPreviousMonth}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => setDate(new Date())}
                  >
                    Today
                  </Button>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={goToNextMonth}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              <Calendar
                mode="single"
                selected={date}
                onSelect={(newDate) => newDate && setDate(newDate)}
                className="rounded-md border"
                modifiers={{
                  withTasks: hasTasksOnDate,
                }}
                modifiersClassNames={{
                  withTasks: "bg-primary/10 text-primary font-medium",
                }}
              />
              <div className="mt-4 text-center text-sm text-muted-foreground">
                Days with scheduled tasks are highlighted
              </div>
            </CardContent>
          </Card>
          
          {/* Volunteers List */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Volunteers</CardTitle>
              <CardDescription>
                {volunteers.length} volunteers registered at your orphanage
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-4">Loading volunteers...</div>
              ) : volunteers.length > 0 ? (
                <div className="space-y-2">
                  {volunteers.map(volunteer => (
                    <div key={volunteer.id} className="flex items-center p-2 bg-muted rounded-md">
                      <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center mr-2">
                        {volunteer.photo ? (
                          <img 
                            src={volunteer.photo} 
                            alt={volunteer.name} 
                            className="h-8 w-8 rounded-full object-cover"
                          />
                        ) : (
                          getInitials(volunteer.name)
                        )}
                      </div>
                      <span>{volunteer.name}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  No volunteers found for your orphanage
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Tasks Column */}
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>
                Tasks for {format(date, "MMMM d, yyyy")}
              </CardTitle>
              <CardDescription>
                {filteredTasks.length} task(s) scheduled for this date
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-12">Loading tasks...</div>
              ) : filteredTasks.length > 0 ? (
                <div className="space-y-6">
                  {filteredTasks.map(task => (
                    <Card key={task.id} className="overflow-hidden">
                      <div className="h-2 bg-primary"></div>
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg">{task.title}</CardTitle>
                            <div className="text-sm text-muted-foreground">
                              {task.startTime} - {task.endTime} • {task.location}
                            </div>
                          </div>
                          <Badge>{task.category}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="mt-4">
                          <h3 className="text-sm font-medium mb-2">Assigned Volunteers:</h3>
                          {task.volunteers && task.volunteers.length > 0 ? (
                            task.volunteers.map(volunteer => (
                              <div key={volunteer.id} className="border rounded-md p-4 mb-2">
                                <div className="flex justify-between items-center">
                                  <div className="flex items-center">
                                    <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center mr-3">
                                      {volunteer.photo ? (
                                        <img 
                                          src={volunteer.photo} 
                                          alt={volunteer.name} 
                                          className="h-10 w-10 rounded-full object-cover"
                                        />
                                      ) : (
                                        getInitials(volunteer.name)
                                      )}
                                    </div>
                                    <span className="font-medium">{volunteer.name}</span>
                                  </div>
                                  <Badge variant="outline">
                                    {volunteer.attendance || "Pending"}
                                  </Badge>
                                </div>
                                
                                <div className="mt-4 flex space-x-2">
                                  <Button 
                                    size="sm" 
                                    className="bg-green-600"
                                    onClick={() => markAttendance(task.id, volunteer.id, "present")}
                                  >
                                    Present
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    className="text-red-600"
                                    onClick={() => markAttendance(task.id, volunteer.id, "absent")}
                                  >
                                    Absent
                                  </Button>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-4 text-muted-foreground">
                              No volunteers assigned to this task
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <CalendarIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium">No Tasks Scheduled</h3>
                  <p className="text-muted-foreground mt-2">
                    There are no volunteer tasks scheduled for this date.
                  </p>
                  <Button variant="outline" className="mt-4">
                    Create New Task
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default VolunteerCalendar;









