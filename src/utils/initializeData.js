import { collection, addDoc, getDocs, query, limit, setDoc, doc } from "firebase/firestore";
import { db } from "../lib/firebase";

// Function to initialize sample data
export const initializeSampleData = async () => {
  try {
    // Check if we already have orphanages
    const orphanagesQuery = query(collection(db, "orphanages"), limit(1));
    const orphanagesSnapshot = await getDocs(orphanagesQuery);
    
    if (!orphanagesSnapshot.empty) {
      console.log("Sample data already exists");
      return;
    }
    
    console.log("Initializing sample data...");
    
    // Add sample orphanages
    const orphanages = [
      {
        name: "Hope Children's Home",
        description: "A safe haven for children in need",
        location: "Yaoundé, Cameroon",
        contactEmail: "hope@example.com",
        contactPhone: "+237 123456789",
        childrenCount: 25,
        needs: ["food", "clothing", "education"],
        createdAt: Date.now()
      },
      {
        name: "Sunshine Orphanage",
        description: "Providing care and education for orphaned children",
        location: "Douala, Cameroon",
        contactEmail: "sunshine@example.com",
        contactPhone: "+237 987654321",
        childrenCount: 18,
        needs: ["medical", "shelter", "education"],
        createdAt: Date.now()
      }
    ];
    
    for (const orphanage of orphanages) {
      await addDoc(collection(db, "orphanages"), orphanage);
    }
    
    console.log("Sample data initialized successfully");
  } catch (error) {
    console.error("Error initializing sample data:", error);
  }
};



