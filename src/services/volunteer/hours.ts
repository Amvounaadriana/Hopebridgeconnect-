
import { collection, addDoc, getDoc, doc, getDocs, query, where, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Task } from "@/types/models";
import { checkAndCreateCertificates } from "./certificates";

/**
 * Log volunteer hours for a completed task
 */
export const logVolunteerHours = async (
  taskId: string, 
  volunteerId: string,
  volunteerName: string,
  hoursLogged: number,
  notes?: string
) => {
  try {
    // Get the task details
    const taskRef = doc(db, "tasks", taskId);
    const taskDoc = await getDoc(taskRef);
    
    if (!taskDoc.exists()) {
      throw new Error("Task not found");
    }
    
    const taskData = taskDoc.data() as Task;
    
    // Log hours in the hours collection
    const hoursCollection = collection(db, "volunteerHours");
    await addDoc(hoursCollection, {
      taskId,
      taskTitle: taskData.title,
      volunteerId,
      volunteerName,
      orphanageId: taskData.orphanageId,
      orphanageName: taskData.orphanageName,
      hours: hoursLogged,
      date: new Date().toISOString(),
      notes: notes || "",
      createdAt: Date.now()
    });
    
    // Update task status to completed for this volunteer
    const volunteerIndex = taskData.volunteers?.findIndex(v => v.id === volunteerId) ?? -1;
    if (volunteerIndex >= 0) {
      const updatedVolunteers = [...taskData.volunteers || []];
      
      // Update the task with the completion status
      await updateDoc(taskRef, {
        volunteers: updatedVolunteers,
        updatedAt: Date.now(),
        // Add a separate completedHours field to the task document
        completedHours: {
          ...(taskData.completedHours || {}),
          [volunteerId]: hoursLogged
        }
      });
    }
    
    // Check if volunteer qualifies for any certificates
    // Get total hours logged
    const hoursQuery = query(
      hoursCollection,
      where("volunteerId", "==", volunteerId)
    );
    const hoursSnapshot = await getDocs(hoursQuery);
    const totalHours = hoursSnapshot.docs.reduce((total, doc) => total + doc.data().hours, 0);
    
    // Check for certificate eligibility
    await checkAndCreateCertificates(volunteerId, volunteerName, totalHours);
    
    return true;
  } catch (error) {
    console.error("Error logging volunteer hours:", error);
    throw error;
  }
};

/**
 * Get total hours logged by a volunteer
 */
export const getVolunteerTotalHours = async (volunteerId: string) => {
  try {
    const hoursCollection = collection(db, "volunteerHours");
    const q = query(hoursCollection, where("volunteerId", "==", volunteerId));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.reduce((total, doc) => total + doc.data().hours, 0);
  } catch (error) {
    console.error("Error getting volunteer hours:", error);
    throw error;
  }
};
