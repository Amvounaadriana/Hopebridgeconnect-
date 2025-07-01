import { db } from "@/lib/firebase";
import { doc, updateDoc, arrayRemove, collection, query, where, getDocs, onSnapshot } from "firebase/firestore";

/**
 * Set user online status and lastSeen
 */
export const setUserOnline = async (userId: string) => {
  try {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      online: true,
      lastSeen: Date.now()
    });
  } catch (error) {
    console.error("Error setting user online:", error);
  }
};

/**
 * Set user offline status and lastSeen
 */
export const setUserOffline = async (userId: string) => {
  try {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      online: false,
      lastSeen: Date.now()
    });
  } catch (error) {
    console.error("Error setting user offline:", error);
  }
};

/**
 * Listen to a user's online status (returns unsubscribe function)
 */
export const listenToUserPresence = (userId: string, callback: (online: boolean, lastSeen: number) => void) => {
  const userRef = doc(db, "users", userId);
  return onSnapshot(userRef, (docSnap) => {
    const data = docSnap.data();
    callback(data?.online ?? false, data?.lastSeen ?? 0);
  });
};

/**
 * Dismiss a volunteer from an orphanage
 * @param volunteerId The ID of the volunteer to dismiss
 * @param reason Optional reason for dismissal
 */
export const dismissVolunteer = async (volunteerId: string, reason?: string) => {
  try {
    // Remove volunteer from any upcoming tasks (statuts: 'open' or 'signed-up')
    const tasksRef = collection(db, "tasks");
    const tasksQuery = query(
      tasksRef,
      where("volunteers", ">", []), // Only tasks with volunteers
      where("statuts", "in", ["open", "signed-up"])
    );
    const tasksSnapshot = await getDocs(tasksQuery);
    const updatePromises = tasksSnapshot.docs.map(taskDoc => {
      const taskData = taskDoc.data();
      const updatedVolunteers = (taskData.volunteers || []).filter((v: any) => v.id !== volunteerId);
      const taskRef = doc(db, "tasks", taskDoc.id);
      return updateDoc(taskRef, {
        volunteers: updatedVolunteers
      });
    });
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
    const tasksQuery = query(tasksRef, where("volunteers", ">", []));
    const tasksSnapshot = await getDocs(tasksQuery);
    const tasks = tasksSnapshot.docs
      .map(docSnap => ({ id: docSnap.id, ...docSnap.data() }))
      .filter((task: any) => (task.volunteers || []).some((v: any) => v.id === volunteerId));
    return tasks;
  } catch (error) {
    console.error("Error fetching volunteer tasks:", error);
    throw new Error("Failed to fetch volunteer tasks");
  }
}
