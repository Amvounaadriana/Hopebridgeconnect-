import { useState, useEffect } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Calendar, Users, BookOpen, Music, Palette, HeartPulse, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { updateDoc } from "firebase/firestore";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
  orderBy,
  doc,
  getDoc,
} from "firebase/firestore";

interface Task {
  id: string;
  title: string;
  orphanageId: string;
  orphanageName: string;
  location: string;
  category: string;
  date: string;
  startTime: string;
  endTime: string;
  slots: number;
  filledSlots: number;
  description: string;
  status: string;
  volunteers?: Array<{ id: string; name: string }>;
}

const categoryIcons: Record<string, JSX.Element> = {
  education: <BookOpen className="h-4 w-4" />,
  health: <HeartPulse className="h-4 w-4" />,
  arts: <Palette className="h-4 w-4" />,
  sports: <Users className="h-4 w-4" />,
  mentoring: <Music className="h-4 w-4" />,
  maintenance: <Users className="h-4 w-4" />,
};

const VolunteerTasks = () => {
  const { toast } = useToast();
  const { currentUser, userProfile } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"open" | "my-tasks">("open");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddTask, setShowAddTask] = useState(false);

  // Add Task Form State
  const [newTask, setNewTask] = useState({
    title: "",
    orphanageName: userProfile?.orphanageName || "",
    location: userProfile?.location || "",
    category: "education",
    date: "",
    startTime: "",
    endTime: "",
    slots: 1,
    description: "",
  });

  // Fetch tasks from Firestore
  useEffect(() => {
    const fetchTasks = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, "tasks"), orderBy("date", "desc"));
        const snapshot = await getDocs(q);
        const fetched: Task[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          fetched.push({
            id: doc.id,
            title: data.title || "",
            orphanageId: data.orphanageId || "",
            orphanageName: data.orphanageName || "",
            location: data.location || "",
            category: data.category || "",
            date: data.date || "",
            startTime: data.startTime || "",
            endTime: data.endTime || "",
            slots: data.slots || 0,
            filledSlots: data.filledSlots || 0,
            description: data.description || "",
            status: data.statuts || "open",
            volunteers: data.volunteers || [],
          });
        });
        setTasks(fetched);
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load available tasks",
        });
      } finally {
        setLoading(false);
      }
    };
    fetchTasks();
  }, [toast]);

  // Sign up for a task
  const handleSignUp = async (taskId: string) => {
    if (!currentUser?.uid || !userProfile?.displayName) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "You must be logged in to sign up for tasks",
      });
      return;
    }
    try {
      // Update Firestore
      const taskRef = collection(db, "tasks");
      const q = query(taskRef, where("__name__", "==", taskId));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const docRef = snapshot.docs[0].ref;
        // Add volunteer to the volunteers array
        const task = snapshot.docs[0].data();
        const updatedVolunteers = [
          ...(task.volunteers || []),
          { id: currentUser.uid, name: userProfile.displayName },
        ];
        const updatedFilledSlots = (task.filledSlots || 0) + 1;
        const updatedStatus =
          updatedFilledSlots >= (task.slots || 1) ? "completed" : "open";
        await updateDoc(docRef, {
          volunteers: updatedVolunteers,
          filledSlots: updatedFilledSlots,
          statuts: updatedStatus,
        });

        // Update volunteer's orphanageIds array in their user profile
        const userDocRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists()) {
          const userData = userSnap.data();
          let orphanageIds = userData.orphanageIds || [];
          if (!orphanageIds.includes(task.orphanageId)) {
            orphanageIds = [...orphanageIds, task.orphanageId];
            await updateDoc(userDocRef, { orphanageIds });
          }
        }

        // Update local state
        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  volunteers: updatedVolunteers,
                  filledSlots: updatedFilledSlots,
                  status: updatedStatus,
                }
              : t
          )
        );
        toast({
          title: "Successfully signed up!",
          description: "You have been assigned to this task.",
        });
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to sign up for task",
      });
    }
  };

  // Add new task to Firestore
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.uid || !userProfile?.orphanageName) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "You must be logged in and linked to an orphanage to add tasks.",
      });
      return;
    }
    try {
      await addDoc(collection(db, "tasks"), {
        ...newTask,
        orphanageId: userProfile.uid,
        orphanageName: userProfile.orphanageName,
        filledSlots: 0,
        statuts: "open",
        createdAt: serverTimestamp(),
        volunteers: [],
      });
      toast({
        title: "Task added!",
        description: "Your task has been created.",
      });
      setShowAddTask(false);
      setNewTask({
        title: "",
        orphanageName: userProfile.orphanageName,
        location: userProfile.location || "",
        category: "education",
        date: "",
        startTime: "",
        endTime: "",
        slots: 1,
        description: "",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to add task",
      });
    }
  };

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.orphanageName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      categoryFilter === "all" || task.category === categoryFilter;
    const matchesTab =
      (activeTab === "open" && task.status === "open") ||
      (activeTab === "my-tasks" &&
        task.volunteers?.some((v) => v.id === currentUser?.uid));
    return matchesSearch && matchesCategory && matchesTab;
  });

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "education":
        return "bg-blue-100 text-blue-800";
      case "health":
        return "bg-red-100 text-red-800";
      case "arts":
        return "bg-purple-100 text-purple-800";
      case "sports":
        return "bg-green-100 text-green-800";
      case "mentoring":
        return "bg-amber-100 text-amber-800";
      case "maintenance":
        return "bg-gray-200 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Volunteer Tasks</h1>
        <Button onClick={() => setShowAddTask((v) => !v)}>
          <Plus className="mr-2 h-4 w-4" /> Add Task
        </Button>
      </div>

      {showAddTask && (
        <form
          className="bg-white border rounded-lg p-6 mb-6 space-y-4"
          onSubmit={handleAddTask}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              placeholder="Task Title"
              value={newTask.title}
              onChange={(e) =>
                setNewTask((t) => ({ ...t, title: e.target.value }))
              }
              required
            />
            <Input
              placeholder="Location"
              value={newTask.location}
              onChange={(e) =>
                setNewTask((t) => ({ ...t, location: e.target.value }))
              }
              required
            />
            <select
              value={newTask.category}
              onChange={(e) =>
                setNewTask((t) => ({ ...t, category: e.target.value }))
              }
              className="border border-input bg-background px-3 py-2 rounded-md text-sm"
              required
            >
              <option value="education">Education</option>
              <option value="health">Health</option>
              <option value="arts">Arts</option>
              <option value="sports">Sports</option>
              <option value="mentoring">Mentoring</option>
              <option value="maintenance">Maintenance</option>
            </select>
            <Input
              type="date"
              value={newTask.date}
              onChange={(e) =>
                setNewTask((t) => ({ ...t, date: e.target.value }))
              }
              required
            />
            <Input
              type="time"
              value={newTask.startTime}
              onChange={(e) =>
                setNewTask((t) => ({ ...t, startTime: e.target.value }))
              }
              required
            />
            <Input
              type="time"
              value={newTask.endTime}
              onChange={(e) =>
                setNewTask((t) => ({ ...t, endTime: e.target.value }))
              }
              required
            />
            <Input
              type="number"
              min={1}
              value={newTask.slots}
              onChange={(e) =>
                setNewTask((t) => ({
                  ...t,
                  slots: Number(e.target.value),
                }))
              }
              placeholder="Slots"
              required
            />
          </div>
          <Input
            placeholder="Description"
            value={newTask.description}
            onChange={(e) =>
              setNewTask((t) => ({ ...t, description: e.target.value }))
            }
            required
          />
          <div className="flex gap-2">
            <Button type="submit">Create Task</Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowAddTask(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "open" | "my-tasks")}>
        <div className="flex justify-between items-end flex-wrap gap-4">
          <TabsList>
            <TabsTrigger value="open">Open Tasks</TabsTrigger>
            <TabsTrigger value="my-tasks">My Tasks</TabsTrigger>
          </TabsList>
          <div className="flex flex-wrap gap-2">
            <div className="relative w-full md:w-auto">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tasks..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="border border-input bg-background px-3 py-2 rounded-md text-sm"
            >
              <option value="all">All Categories</option>
              <option value="education">Education</option>
              <option value="health">Health</option>
              <option value="arts">Arts</option>
              <option value="sports">Sports</option>
              <option value="mentoring">Mentoring</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </div>
        </div>

        <TabsContent value="open" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTasks.map((task) => (
              <Card key={task.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`p-1 rounded-full ${getCategoryColor(task.category)}`}>
                          {categoryIcons[task.category] || <Users className="h-4 w-4" />}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full ${getCategoryColor(task.category)}`}>
                          {task.category}
                        </span>
                      </div>
                      <CardTitle className="font-semibold text-lg">{task.title}</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">{task.orphanageName}</span>
                      <span className="text-xs ml-1">({task.location})</span>
                    </p>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {task.date}
                      </span>
                      <span>•</span>
                      <span>
                        {task.startTime} - {task.endTime}
                      </span>
                    </div>
                    <p className="text-sm">
                      <span className="font-medium">{task.slots} slots</span>
                      <span className="mx-1">•</span>
                      <span className={task.slots === task.filledSlots ? "text-red-500" : "text-green-500"}>
                        {task.slots - task.filledSlots} spot{task.slots - task.filledSlots !== 1 ? "s" : ""} left
                      </span>
                    </p>
                    <p className="text-sm line-clamp-3">{task.description}</p>
                  </div>
                </CardContent>
                <CardFooter className="pt-2 border-t">
                  <Button
                    className="w-full"
                    variant={task.slots === task.filledSlots ? "outline" : "default"}
                    disabled={task.slots === task.filledSlots}
                    onClick={() => handleSignUp(task.id)}
                  >
                    {task.slots === task.filledSlots ? "No Spots Left" : "Sign Up"}
                  </Button>
                </CardFooter>
              </Card>
            ))}
            {activeTab === "open" && filteredTasks.length === 0 && (
              <div className="col-span-full text-center py-12">
                <p className="text-muted-foreground mb-2">
                  No open tasks match your search criteria
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchQuery("");
                    setCategoryFilter("all");
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="my-tasks" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredTasks.map(task => (
              <Card key={task.id} className="overflow-hidden">
                <div className={`h-2 ${
                  task.status === "completed" ? "bg-green-500" : "bg-blue-500"
                }`} />
                <CardContent className="pt-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`p-1 rounded-full ${getCategoryColor(task.category)}`}>
                          {categoryIcons[task.category]}
                        </span>
                        <Badge variant="outline" className={task.status === "completed" ? "border-green-500 text-green-700" : ""}>
                          {task.status === "assigned" ? "Upcoming" : "Completed"}
                        </Badge>
                      </div>
                      <h3 className="font-semibold text-lg">{task.title}</h3>
                    </div>
                  </div>
                  
                  <div className="mt-2 space-y-2">
                    <p className="text-sm">
                      <span className="font-medium">{task.orphanageName}</span>
                      <span className="text-xs ml-1">({task.location})</span>
                    </p>
                    
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {task.date}
                      </span>
                      <span>•</span>
                      <span>
                        {task.startTime} - {task.endTime}
                      </span>
                    </div>
                    
                    <p className="text-sm">
                      <span className="font-medium">{task.slots} volunteers needed</span>
                    </p>
                    
                    {task.status === "assigned" && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Team:</span>
                        <div className="flex -space-x-2">
                          {Array(task.filledSlots).fill(0).map((_, i) => (
                            <Avatar key={i} className="h-6 w-6 border-2 border-background">
                              <AvatarFallback className="text-xs">
                                {String.fromCharCode(65 + i)}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-end mt-4">
                    {task.status === "assigned" ? (
                      <Button variant="outline" size="sm">
                        Cancel Participation
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm">
                        View Certificate
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {activeTab === "my-tasks" && filteredTasks.length === 0 && (
              <div className="col-span-full text-center py-12">
                <p className="text-muted-foreground mb-2">
                  You haven't signed up for any tasks yet
                </p>
                <Button onClick={() => setActiveTab("open")}>
                  Browse Open Tasks
                </Button>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default VolunteerTasks;

