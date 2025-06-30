import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const DonorDashboard = () => {
  const { userProfile, currentUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState([
    { title: "Total Donated", value: "CFA 0", icon: "💰", color: "bg-hope-50 text-hope-700" },
    { title: "Active Sponsorships", value: 0, icon: "🤲", color: "bg-bridge-50 text-bridge-700" },
    { title: "Children Helped", value: 0, icon: "👶", color: "bg-green-50 text-green-700" },
  ]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [featuredWishes, setFeaturedWishes] = useState([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!currentUser?.uid) return;
      
      try {
        setLoading(true);
        
        // Fetch total donations
        const paymentsRef = collection(db, "payments");
        const paymentsQuery = query(
          paymentsRef,
          where("donorId", "==", currentUser.uid),
          where("status", "==", "successful")
        );
        const paymentsSnapshot = await getDocs(paymentsQuery);
        
        let totalDonated = 0;
        paymentsSnapshot.forEach((doc) => {
          const payment = doc.data();
          totalDonated += payment.amount || 0;
        });
        
        // Fetch active sponsorships
        const sponsorshipsRef = collection(db, "sponsorships");
        const sponsorshipsQuery = query(
          sponsorshipsRef,
          where("donorId", "==", currentUser.uid),
          where("status", "==", "active")
        );
        const sponsorshipsSnapshot = await getDocs(sponsorshipsQuery);
        const activeSponshorships = sponsorshipsSnapshot.size;
        
        // Count unique children helped
        const childrenHelped = new Set();
        
        // Add children from payments
        paymentsSnapshot.forEach((doc) => {
          const payment = doc.data();
          if (payment.childId) {
            childrenHelped.add(payment.childId);
          }
        });
        
        // Add children from sponsorships
        sponsorshipsSnapshot.forEach((doc) => {
          const sponsorship = doc.data();
          if (sponsorship.childId) {
            childrenHelped.add(sponsorship.childId);
          }
        });
        
        // Update metrics
        setMetrics([
          { 
            title: "Total Donated", 
            value: `CFA ${totalDonated.toFixed(0)}`, 
            icon: "💰", 
            color: "bg-hope-50 text-hope-700" 
          },
          { 
            title: "Active Sponsorships", 
            value: activeSponshorships, 
            icon: "🤲", 
            color: "bg-bridge-50 text-bridge-700" 
          },
          { 
            title: "Children Helped", 
            value: childrenHelped.size, 
            icon: "👶", 
            color: "bg-green-50 text-green-700" 
          },
        ]);
        
        // Fetch recent activity (payments, sponsorships, wishes)
        const recentActivityData = [];
        
        // Recent payments
        const recentPaymentsQuery = query(
          paymentsRef,
          where("donorId", "==", currentUser.uid),
          orderBy("createdAt", "desc"),
          limit(3)
        );
        const recentPaymentsSnapshot = await getDocs(recentPaymentsQuery);
        
        recentPaymentsSnapshot.forEach((doc) => {
          const payment = doc.data();
          recentActivityData.push({
            id: doc.id,
            type: "payment",
            amount: payment.amount,
            currency: payment.currency || "CFA",
            date: payment.createdAt ? new Date(payment.createdAt).toLocaleDateString() : "Unknown date",
            status: payment.status,
            purpose: payment.purpose || "Donation",
          });
        });
        
        // Recent sponsorships
        const recentSponsorshipsQuery = query(
          sponsorshipsRef,
          where("donorId", "==", currentUser.uid),
          orderBy("createdAt", "desc"),
          limit(3)
        );
        const recentSponsorshipsSnapshot = await getDocs(recentSponsorshipsQuery);
        
        recentSponsorshipsSnapshot.forEach((doc) => {
          const sponsorship = doc.data();
          recentActivityData.push({
            id: doc.id,
            type: "sponsorship",
            childName: sponsorship.childName,
            amount: sponsorship.amount,
            currency: sponsorship.currency || "CFA",
            date: sponsorship.createdAt ? new Date(sponsorship.createdAt).toLocaleDateString() : "Unknown date",
            status: sponsorship.status,
          });
        });
        
        // Sort by date
        recentActivityData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        setRecentActivity(recentActivityData.slice(0, 5));
        
        // Fetch featured wishes
        const wishesRef = collection(db, "wishes");
        const featuredWishesQuery = query(
          wishesRef,
          where("status", "==", "active"),
          orderBy("createdAt", "desc"),
          limit(3)
        );
        const featuredWishesSnapshot = await getDocs(featuredWishesQuery);
        
        const featuredWishesData = [];
        featuredWishesSnapshot.forEach((doc) => {
          const wish = doc.data();
          featuredWishesData.push({
            id: doc.id,
            childName: wish.childName || "Unknown",
            childAge: wish.childAge || "?",
            item: wish.item,
            orphanageId: wish.orphanageId,
          });
        });
        
        setFeaturedWishes(featuredWishesData);
        
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, [currentUser?.uid]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-200px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Donor Dashboard</h1>
      
      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {metrics.map((metric, index) => (
          <Card key={index}>
            <CardHeader className={`flex flex-row items-center justify-between pb-2 ${metric.color} rounded-t-lg`}>
              <CardTitle className="text-lg font-medium">{metric.title}</CardTitle>
              <div className="text-2xl">{metric.icon}</div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{metric.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity.length > 0 ? (
              <div className="space-y-4">
                {recentActivity.map((activity: any, index) => (
                  <div key={index} className="flex justify-between items-center border-b pb-3">
                    <div>
                      <p className="font-medium">
                        {activity.type === "payment" 
                          ? `Donation: ${activity.purpose}`
                          : `Sponsorship: ${activity.childName}`}
                      </p>
                      <p className="text-sm text-muted-foreground">{activity.date}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {activity.amount} {activity.currency}
                      </p>
                      <p className={`text-sm ${
                        activity.status === "successful" || activity.status === "active" 
                          ? "text-green-600" 
                          : activity.status === "pending" 
                            ? "text-amber-600" 
                            : "text-red-600"
                      }`}>
                        {activity.status}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">No recent activity</p>
            )}
            
            <div className="mt-4">
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => navigate("/donor/history")}
              >
                View All Activity
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {/* Featured Wishes */}
        <Card>
          <CardHeader>
            <CardTitle>Children's Wishes</CardTitle>
          </CardHeader>
          <CardContent>
            {featuredWishes.length > 0 ? (
              <div className="space-y-4">
                {featuredWishes.map((wish: any, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <p className="font-medium">{wish.childName}, age {wish.childAge}</p>
                    </div>
                    <p className="text-sm mb-3">{wish.item}</p>
                    <Button 
                      size="sm"
                      onClick={() => navigate(`/donor/wish/${wish.id}`)}
                    >
                      Fulfill Wish
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">No wishes available right now</p>
            )}
            
            <div className="mt-4">
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => navigate("/donor/wishes")}
              >
                View All Wishes
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Quick Actions */}
      <div className="mt-8">
        <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <Button 
            className="h-auto py-6 flex flex-col"
            onClick={() => navigate("/donor/orphanages")}
          >
            <span className="text-2xl mb-2">💰</span>
            <span className="font-medium">Make a Donation</span>
          </Button>
          <Button 
            variant="outline"
            className="h-auto py-6 flex flex-col"
            onClick={() => navigate("/donor/orphanages")}
          >
            <span className="text-2xl mb-2">🤲</span>
            <span className="font-medium">Sponsor a Child</span>
          </Button>
          <Button 
            variant="outline"
            className="h-auto py-6 flex flex-col"
            onClick={() => navigate("/donor/wishes")}
          >
            <span className="text-2xl mb-2">✨</span>
            <span className="font-medium">Fulfill a Wish</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DonorDashboard;


