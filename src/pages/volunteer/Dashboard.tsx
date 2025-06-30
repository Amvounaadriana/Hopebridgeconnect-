import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { collection, query, where, getDocs, orderBy, limit, doc, updateDoc, arrayUnion, increment } from "firebase/firestore";
import { db } from "@/lib/firebase";

const VolunteerDashboard = () => {
  const { userProfile, currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState([
    { title: "Upcoming Tasks", value: 0, icon: "📝", color: "bg-hope-50 text-hope-700" },
    { title: "Hours Logged", value: "0 hrs", icon: "⏱️", color: "bg-bridge-50 text-bridge-700" },
    { title: "Completed Tasks", value: 0, icon: "✅", color: "bg-green-50 text-green-700" },
  ]);
  const [schedule, setSchedule] = useState([]);
  const [openTasks, setOpenTasks] = useState([]);
  const [totalHours, setTotalHours] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState("");

  const fetchDashboardData = async () => {
    if (!currentUser?.uid) return;
    try {
      setLoading(true);
      const tasksRef = collection(db, "tasks");

      const upcomingTasksQuery = query(
        tasksRef,
        where("volunteerIds", "array-contains", currentUser.uid),
        where("status", "==", "upcoming"),
        orderBy("date", "asc")
      );
      const upcomingTasksSnapshot = await getDocs(upcomingTasksQuery);
      const upcomingTasks = [];
      upcomingTasksSnapshot.forEach(doc => {
        upcomingTasks.push({ id: doc.id, ...doc.data() });
      });

      const completedTasksQuery = query(
        tasksRef,
        where("volunteerIds", "array-contains", currentUser.uid),
        where("status", "==", "completed")
      );
      const completedTasksSnapshot = await getDocs(completedTasksQuery);
      const completedTasksCount = completedTasksSnapshot.size;

      let total = 0;
      let orphanages = new Set();
      completedTasksSnapshot.forEach(doc => {
        const task = doc.data();
        total += task.duration || 0;
        if (task.orphanageName) {
          orphanages.add(task.orphanageName);
        }
      });

      setTotalHours(total);

      setMetrics([
        { title: "Upcoming Tasks", value: upcomingTasks.length, icon: "📝", color: "bg-hope-50 text-hope-700" },
        { title: "Hours Logged", value: `${total} hrs`, icon: "⏱️", color: "bg-bridge-50 text-bridge-700" },
        { title: "Completed Tasks", value: completedTasksCount, icon: "✅", color: "bg-green-50 text-green-700" },
      ]);

      const today = new Date();
      const nextWeek = new Date();
      nextWeek.setDate(today.getDate() + 7);
      const scheduleQuery = query(
        tasksRef,
        where("volunteerIds", "array-contains", currentUser.uid),
        where("date", ">=", today),
        where("date", "<=", nextWeek),
        orderBy("date", "asc"),
        limit(3)
      );
      const scheduleSnapshot = await getDocs(scheduleQuery);
      const scheduleData = [];
      scheduleSnapshot.forEach(doc => {
        scheduleData.push({ id: doc.id, ...doc.data() });
      });
      setSchedule(scheduleData);

      const openTasksQuery = query(
        tasksRef,
        where("status", "==", "open"),
        orderBy("date", "asc"),
        limit(2)
      );
      const openTasksSnapshot = await getDocs(openTasksQuery);
      const openTasksData = [];
      openTasksSnapshot.forEach(doc => {
        openTasksData.push({ id: doc.id, ...doc.data() });
      });
      setOpenTasks(openTasksData);

      if (total >= 40) {
        const queryParams = new URLSearchParams({
          name: userProfile?.displayName || "Volunteer",
          role: userProfile?.role || "Volunteer",
          hours: total.toString(),
          orphanages: Array.from(orphanages).join(", ")
        });
        setDownloadUrl(`/api/generate-certificate?${queryParams.toString()}`);
      }

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [currentUser?.uid]);

  const handleSignUp = async (taskId) => {
    try {
      const taskRef = doc(db, "tasks", taskId);
      await updateDoc(taskRef, {
        volunteerIds: arrayUnion(currentUser.uid),
        spotsFilled: increment(1)
      });
      setOpenTasks(prev => prev.filter(task => task.id !== taskId));
      fetchDashboardData();
    } catch (error) {
      console.error("Error signing up for task:", error);
    }
  };

  if (loading) {
    return <div>Loading dashboard data...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Welcome, {userProfile?.displayName}</h1>
        <p className="text-muted-foreground">
          Thank you for your service! Here's a summary of your volunteer activities
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {metrics.map((metric) => (
          <Card key={metric.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
              <div className={`p-2 rounded-full ${metric.color}`}>{metric.icon}</div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Schedule for Next Week</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {schedule.length > 0 ? (
              schedule.map((task) => (
                <div key={task.id} className="border-b pb-2">
                  <p className="font-medium">{new Date(task.date.toDate()).toLocaleDateString('en-US', { weekday: 'long' })}, {task.startTime} - {task.endTime}</p>
                  <p className="text-sm text-muted-foreground">{task.title} at {task.orphanageName}</p>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground">No upcoming tasks scheduled</p>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Open Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {openTasks.length > 0 ? (
                openTasks.map((task) => (
                  <div key={task.id} className="flex items-center space-x-4 border-b pb-2">
                    <div>
                      <p className="font-medium">{task.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {task.orphanageName} • {new Date(task.date.toDate()).toLocaleDateString('en-US', { weekday: 'long' })} {task.startTime}-{task.endTime}
                      </p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="ml-auto"
                      onClick={() => handleSignUp(task.id)}
                    >
                      Sign Up
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground">No open tasks available</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Certificate Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">40 Hour Certificate</span>
                <span className="text-sm font-medium">{totalHours}/40 Hours</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-hope-500 rounded-full" style={{ width: `${Math.min((totalHours / 40) * 100, 100)}%` }}></div>
              </div>
              {totalHours >= 40 && (
                <a href={downloadUrl} download>
                  <Button className="w-full mt-4">Download Certificate</Button>
                </a>
              )}
              <div className="flex items-center justify-between mt-6">
                <span className="text-sm font-medium">100 Hour Certificate</span>
                <span className="text-sm font-medium">{totalHours}/100 Hours</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-hope-500 rounded-full" style={{ width: `${Math.min((totalHours / 100) * 100, 100)}%` }}></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VolunteerDashboard;
