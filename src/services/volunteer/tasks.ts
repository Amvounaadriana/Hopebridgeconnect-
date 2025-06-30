
import { collection, addDoc, updateDoc, doc, getDoc, getDocs, query, where, arrayUnion, arrayRemove } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Task } from "@/types/models";

/**
 * Get all available tasks that volunteers can sign up for
 */
export const getAvailableTasks = async () => {
  try {
    const tasksCollection = collection(db, "tasks");
    const q = query(
      tasksCollection, 
      where("status", "==", "open"),
      where("filledSlots", "<", "slots")
    );
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
  } catch (error) {
    console.error("Error getting tasks:", error);
    throw error;
  }
};

/**
 * Get tasks assigned to a specific volunteer
 */
export const getTasksByVolunteer = async (volunteerId: string) => {
  try {
    const tasksCollection = collection(db, "tasks");
    const q = query(
      tasksCollection, 
      where("volunteers", "array-contains", { id: volunteerId })
    );
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
  } catch (error) {
    console.error("Error getting tasks:", error);
    throw error;
  }
};

/**
 * Sign up a volunteer for a specific task
 */
export const signupForTask = async (taskId: string, volunteerId: string, volunteerName: string) => {
  try {
    const taskRef = doc(db, "tasks", taskId);
    const taskDoc = await getDoc(taskRef);
    
    if (!taskDoc.exists()) {
      throw new Error("Task not found");
    }
    
    const taskData = taskDoc.data() as Task;
    
    if (taskData.filledSlots >= taskData.slots) {
      throw new Error("Task is already full");
    }
    
    // Check if volunteer is already signed up
    const isVolunteerSigned = taskData.volunteers?.some(v => v.id === volunteerId);
    if (isVolunteerSigned) {
      throw new Error("You are already signed up for this task");
    }
    
    // Update the task with the new volunteer
    await updateDoc(taskRef, {
      volunteers: arrayUnion({ id: volunteerId, name: volunteerName }),
      filledSlots: taskData.filledSlots + 1,
      status: taskData.filledSlots + 1 >= taskData.slots ? "completed" : "open",
      updatedAt: Date.now()
    });
    
    return true;
  } catch (error) {
    console.error("Error signing up for task:", error);
    throw error;
  }
};

/**
 * Cancel a volunteer's participation in a task
 */
export const cancelTaskParticipation = async (taskId: string, volunteerId: string) => {
  try {
    const taskRef = doc(db, "tasks", taskId);
    const taskDoc = await getDoc(taskRef);
    
    if (!taskDoc.exists()) {
      throw new Error("Task not found");
    }
    
    const taskData = taskDoc.data() as Task;
    
    // Find the volunteer entry
    const volunteerEntry = taskData.volunteers?.find(v => v.id === volunteerId);
    if (!volunteerEntry) {
      throw new Error("You are not signed up for this task");
    }
    
    // Remove the volunteer from the task
    await updateDoc(taskRef, {
      volunteers: arrayRemove(volunteerEntry),
      filledSlots: Math.max(0, taskData.filledSlots - 1),
      status: "open", // Re-open the task
      updatedAt: Date.now()
    });
    
    return true;
  } catch (error) {
    console.error("Error canceling task participation:", error);
    throw error;
  }
};
