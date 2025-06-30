import { collection, addDoc, getDocs, query, where, getDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Certificate } from "@/types/models";
import jsPDF from "jspdf";

/**
 * Get certificates for a specific volunteer
 */
export const getCertificatesByVolunteer = async (volunteerId: string) => {
  try {
    const certificatesCollection = collection(db, "certificates");
    const q = query(certificatesCollection, where("volunteerId", "==", volunteerId));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Certificate));
  } catch (error) {
    console.error("Error getting certificates:", error);
    throw error;
  }
};

/**
 * Check if volunteer is eligible for certificates based on hours and create them
 */
export const checkAndCreateCertificates = async (
  volunteerId: string, 
  volunteerName: string, 
  totalHours: number
) => {
  // Certificate thresholds
  const certificateThresholds = [10, 25, 50, 100, 250, 500];
  
  // Check existing certificates to avoid duplicates
  const certificateQuery = query(
    collection(db, "certificates"),
    where("volunteerId", "==", volunteerId)
  );
  const existingCerts = await getDocs(certificateQuery);
  const existingCertHours = existingCerts.docs.map(doc => doc.data().hoursCompleted);
  
  // Find eligible new certificates
  for (const threshold of certificateThresholds) {
    if (totalHours >= threshold && !existingCertHours.includes(threshold)) {
      // Create a new certificate
      await addDoc(collection(db, "certificates"), {
        title: `${threshold} Hours of Service`,
        description: `Certificate of recognition for completing ${threshold} hours of volunteer service.`,
        issueDate: new Date().toISOString(),
        hoursCompleted: threshold,
        volunteerId,
        volunteerName,
        orphanages: [], // This would need to be populated with actual orphanages data
        timeframe: `As of ${new Date().toLocaleDateString()}`,
        status: "available",
        imageUrl: null,
        createdAt: Date.now()
      });
    }
  }
};

/**
 * Generate a PDF certificate
 */
export const generateCertificatePDF = async (certificateId: string) => {
  try {
    // Fetch certificate data from Firestore
    const certRef = doc(db, "certificates", certificateId);
    const certSnap = await getDoc(certRef);
    if (!certSnap.exists()) {
      throw new Error("Certificate not found");
    }
    const cert = certSnap.data() as Certificate;

    // Create PDF
    const docPdf = new jsPDF({ orientation: "landscape" });
    docPdf.setFontSize(28);
    docPdf.text("Certificate of Volunteer Service", 105, 30, { align: "center" });
    docPdf.setFontSize(18);
    docPdf.text(`This certifies that`, 105, 50, { align: "center" });
    docPdf.setFontSize(24);
    docPdf.text(cert.volunteerName, 105, 65, { align: "center" });
    docPdf.setFontSize(18);
    docPdf.text(
      `has completed ${cert.hoursCompleted} hours of volunteer service`,
      105,
      80,
      { align: "center" }
    );
    if (cert.orphanages && cert.orphanages.length > 0) {
      docPdf.setFontSize(14);
      docPdf.text(
        `Orphanages served: ${cert.orphanages.map((o) => o.name).join(", ")}`,
        105,
        95,
        { align: "center" }
      );
    }
    docPdf.setFontSize(14);
    docPdf.text(cert.timeframe || "", 105, 110, { align: "center" });
    docPdf.setFontSize(12);
    docPdf.text(
      `Issued: ${cert.issueDate ? new Date(cert.issueDate).toLocaleDateString() : ""}`,
      105,
      125,
      { align: "center" }
    );
    docPdf.setFontSize(10);
    docPdf.text("HopeBridge Connect", 105, 140, { align: "center" });

    // Download
    docPdf.save(
      `Certificate_${cert.volunteerName.replace(/\s+/g, "_")}_${cert.hoursCompleted}_hours.pdf`
    );
    return { success: true };
  } catch (error) {
    console.error("Error generating certificate PDF:", error);
    throw error;
  }
};
