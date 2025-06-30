
import { db } from "@/lib/firebase";
import { doc, updateDoc, arrayRemove, collection, query, where, getDocs } from "firebase/firestore";

/**
 * Dismiss a volunteer from an orphanage
 * @param volunteerId The ID of the volunteer to dismiss
 * @param reason Optional reason for dismissal
 */
export const dismissVolunteer = async (volunteerId: string, reason?: string) => {
  try {
    // Update the volunteer's status to inactive
    const volunteerRef = doc(db, "users", volunteerId);
    await updateDoc(volunteerRef, { 
      status: "inactive",
      dismissalReason: reason || "Dismissed by administrator",
      dismissedAt: Date.now()
    });
    
    // Remove volunteer from any upcoming tasks
    const tasksRef = collection(db, "tasks");
    const tasksQuery = query(
      tasksRef,
      where("volunteerIds", "array-contains", volunteerId),
      where("status", "in", ["open", "filled"])
    );
    
    const tasksSnapshot = await getDocs(tasksQuery);
    
    // Create a batch of promises to update all tasks
    const updatePromises = tasksSnapshot.docs.map(taskDoc => {
      const taskRef = doc(db, "tasks", taskDoc.id);
      return updateDoc(taskRef, {
        volunteerIds: arrayRemove(volunteerId)
      });
    });
    
    // Execute all updates
    await Promise.all(updatePromises);
    
    return { success: true };
  } catch (error) {
    console.error("Error dismissing volunteer:", error);
    throw new Error("Failed to dismiss volunteer");
  }
}

/**
 * Get all tasks for a specific volunteer
 * @param volunteerId The ID of the volunteer
 */
export const getVolunteerTasks = async (volunteerId: string) => {
  try {
    const tasksRef = collection(db, "tasks");
    const tasksQuery = query(
      tasksRef,
      where("volunteerIds", "array-contains", volunteerId)
    );
    
    const tasksSnapshot = await getDocs(tasksQuery);
    
    const tasks = tasksSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return tasks;
  } catch (error) {
    console.error("Error fetching volunteer tasks:", error);
    throw new Error("Failed to fetch volunteer tasks");
  }
}

