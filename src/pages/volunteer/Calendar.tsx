
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Filter, Calendar as CalendarIcon, X, AlertCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, Timestamp, doc, updateDoc, arrayRemove, orderBy } from "firebase/firestore";

// Define types
interface Orphanage {
  id: string;
  name: string;
  location: string;
}

interface Task {
  id: string;
  title: string;
  orphanageId: string;
  orphanageName: string;
  orphanageLocation: string;
  category: string;
  date: Date;
  startTime: string;
  endTime: string;
  duration: number;
  description: string;
  status: "upcoming" | "completed" | "cancelled" | "open";
}

const VolunteerCalendar: React.FC = () => {
  // State
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [openTaskDialog, setOpenTaskDialog] = useState(false);
  const [cancelTaskDialog, setCancelTaskDialog] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [orphanages, setOrphanages] = useState<Orphanage[]>([]);
  const { toast } = useToast();
  const { currentUser } = useAuth();
  
  // Filter states
  const [orphanageFilter, setOrphanageFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Fetch data from Firebase
  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser) return;
      
      try {
        setLoading(true);
        
        // Fetch orphanages
        const orphanagesRef = collection(db, "orphanages");
        const orphanagesSnapshot = await getDocs(orphanagesRef);
        const orphanagesData: Orphanage[] = [];
        
        orphanagesSnapshot.forEach(doc => {
          orphanagesData.push({
            id: doc.id,
            name: doc.data().name,
            location: doc.data().location || "Unknown Location"
          });
        });
        
        setOrphanages(orphanagesData);
        
        // Fetch tasks
        const tasksRef = collection(db, "tasks");
        
        // Get tasks assigned to the volunteer
        const volunteerTasksQuery = query(
          tasksRef, 
          where("volunteerIds", "array-contains", currentUser.uid),
          orderBy("date", "asc")
        );
        
        const volunteerTasksSnapshot = await getDocs(volunteerTasksQuery);
        
        const tasksData: Task[] = [];
        
        // Process volunteer's tasks
        volunteerTasksSnapshot.forEach(doc => {
          const data = doc.data();
          if (!data.date) return;
          
          const orphanage = orphanagesData.find(o => o.id === data.orphanageId);
          
          tasksData.push({
            id: doc.id,
            title: data.title || "Untitled Task",
            orphanageId: data.orphanageId || "",
            orphanageName: orphanage?.name || "Unknown Orphanage",
            orphanageLocation: orphanage?.location || "Unknown Location",
            category: data.category || "general",
            date: data.date.toDate(),
            startTime: data.startTime || "00:00",
            endTime: data.endTime || "00:00",
            duration: data.duration || 2,
            description: data.description || "",
            status: data.status || "upcoming"
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
  }, [currentUser, toast]);

  // Apply all filters to tasks
  const filteredTasks = tasks.filter(task => {
    return (
      (orphanageFilter === "all" || task.orphanageId === orphanageFilter) &&
      (categoryFilter === "all" || task.category === categoryFilter) &&
      (statusFilter === "all" || task.status === statusFilter)
    );
  });

  const selectedDateTasks = date 
    ? filteredTasks.filter(task => 
        task.date.getDate() === date.getDate() && 
        task.date.getMonth() === date.getMonth() && 
        task.date.getFullYear() === date.getFullYear()
      )
    : [];

  const isDateWithTasks = (day: Date) => {
    return filteredTasks.some(task => 
      task.date.getDate() === day.getDate() && 
      task.date.getMonth() === day.getMonth() && 
      task.date.getFullYear() === day.getFullYear()
    );
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setOpenTaskDialog(true);
  };

  const getCategoryColor = (category: string) => {
    switch(category) {
      case "education": return "bg-blue-100 text-blue-800";
      case "health": return "bg-red-100 text-red-800";
      case "arts": return "bg-purple-100 text-purple-800";
      case "sports": return "bg-green-100 text-green-800";
      case "mentoring": return "bg-amber-100 text-amber-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };
  
  // Cancel a task
  const handleCancelTask = async () => {
    if (!selectedTask || !currentUser) return;
    
    try {
      const taskRef = doc(db, "tasks", selectedTask.id);
      await updateDoc(taskRef, {
        volunteerIds: arrayRemove(currentUser.uid),
        updatedAt: Timestamp.now()
      });
      
      toast({
        title: "Success",
        description: "You have successfully cancelled this task",
      });
      
      // Update local state
      const updatedTasks = tasks.map(task => {
        if (task.id === selectedTask.id) {
          return {
            ...task,
            status: "cancelled" as const
          };
        }
        return task;
      });
      
      setTasks(updatedTasks);
      setCancelTaskDialog(false);
      setOpenTaskDialog(false);
    } catch (error) {
      console.error("Error cancelling task:", error);
      toast({
        title: "Error",
        description: "Failed to cancel this task. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  // Navigate to previous month
  const goToPreviousMonth = () => {
    if (date) {
      const prevMonth = new Date(date);
      prevMonth.setMonth(prevMonth.getMonth() - 1);
      setDate(prevMonth);
    }
  };
  
  // Navigate to next month
  const goToNextMonth = () => {
    if (date) {
      const nextMonth = new Date(date);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      setDate(nextMonth);
    }
  };
  
  // Reset all filters
  const resetFilters = () => {
    setOrphanageFilter("all");
    setCategoryFilter("all");
    setStatusFilter("all");
  };

  // Format time for display
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Volunteer Calendar</h1>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            {showFilters ? "Hide Filters" : "Show Filters"}
          </Button>
        </div>
      </div>
      
      {/* Filters Card */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle>Filter Options</CardTitle>
            <CardDescription>
              Customize your calendar view
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Orphanage</label>
                <Select value={orphanageFilter} onValueChange={setOrphanageFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Orphanage" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Orphanages</SelectItem>
                    {orphanages.map(orphanage => (
                      <SelectItem key={orphanage.id} value={orphanage.id}>
                        {orphanage.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="education">Education</SelectItem>
                    <SelectItem value="health">Health</SelectItem>
                    <SelectItem value="arts">Arts</SelectItem>
                    <SelectItem value="sports">Sports</SelectItem>
                    <SelectItem value="mentoring">Mentoring</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Status" />
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
              <Button variant="outline" onClick={resetFilters} className="mr-2">
                Reset Filters
              </Button>
              <Button onClick={() => setShowFilters(false)}>
                Apply Filters
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          {/* Calendar Card */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle>
                  {date?.toLocaleDateString("en-US", { 
                    month: 'long', 
                    year: 'numeric'
                  })}
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
              {loading ? (
                <div className="flex justify-center py-10">
                  <div className="animate-pulse space-y-4">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-64 bg-gray-200 rounded"></div>
                  </div>
                </div>
              ) : (
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  className="border rounded-md p-2"
                  modifiers={{
                    withTasks: isDateWithTasks,
                  }}
                  modifiersClassNames={{
                    withTasks: "bg-primary/10 text-primary font-medium",
                  }}
                />
              )}
              <div className="mt-4 text-center text-sm text-muted-foreground">
                Days with scheduled tasks are highlighted
              </div>
            </CardContent>
          </Card>
          
          {/* Task Statistics */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Task Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Total Tasks</span>
                  <Badge variant="outline">{tasks.length}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Upcoming</span>
                  <Badge variant="outline" className="bg-blue-50">{tasks.filter(t => t.status === "upcoming").length}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Completed</span>
                  <Badge variant="outline" className="bg-green-50">{tasks.filter(t => t.status === "completed").length}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Cancelled</span>
                  <Badge variant="outline" className="bg-red-50">{tasks.filter(t => t.status === "cancelled").length}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="lg:col-span-2">
          {/* Tasks for Selected Date */}
          <Card>
            <CardHeader>
              <CardTitle>
                Tasks for {date?.toLocaleDateString("en-US", { 
                  weekday: 'long',
                  month: 'long', 
                  day: 'numeric',
                  year: 'numeric'
                })}
              </CardTitle>
              <CardDescription>
                {selectedDateTasks.length === 0 
                  ? "No tasks scheduled for this day" 
                  : `${selectedDateTasks.length} task(s) scheduled`
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="animate-pulse space-y-4">
                  <div className="h-20 bg-gray-200 rounded"></div>
                  <div className="h-20 bg-gray-200 rounded"></div>
                </div>
              ) : selectedDateTasks.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No tasks scheduled for this day</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedDateTasks.map(task => (
                    <Card key={task.id} className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleTaskClick(task)}>
                      <div className={`h-2 ${
                        task.status === "completed" ? "bg-green-500" : 
                        task.status === "cancelled" ? "bg-red-500" : "bg-blue-500"
                      }`} />
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-xs px-2 py-1 rounded-full ${getCategoryColor(task.category)}`}>
                                {task.category.charAt(0).toUpperCase() + task.category.slice(1)}
                              </span>
                              <span className="text-sm text-muted-foreground">
                                {formatTime(task.startTime)} - {formatTime(task.endTime)}
                              </span>
                            </div>
                            <h3 className="font-medium">{task.title}</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              {task.orphanageName}
                            </p>
                          </div>
                          <Badge variant={
                            task.status === "completed" ? "outline" : 
                            task.status === "cancelled" ? "destructive" : "default"
                          }>
                            {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Upcoming Tasks */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Upcoming Tasks</CardTitle>
              <CardDescription>
                Next 7 days schedule
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="animate-pulse space-y-4">
                  <div className="h-16 bg-gray-200 rounded"></div>
                  <div className="h-16 bg-gray-200 rounded"></div>
                  <div className="h-16 bg-gray-200 rounded"></div>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredTasks
                    .filter(task => task.status === "upcoming" && task.date >= new Date())
                    .slice(0, 3)
                    .map(task => (
                      <div key={task.id} className="flex items-center space-x-4">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="!text-blue-600 text-lg font-bold">
                            {task.date.getDate()}
                          </span>
                        </div>
                        <div>
                          <h3 className="!text-blue-600! font-medium!">{task.title}</h3>
                          <p className="!text-blue! !text-sm!">
                            {task.orphanageName} - {formatTime(task.startTime)} - {formatTime(task.endTime)}
                          </p>
                        </div>
                      </div>
                    ))}
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



