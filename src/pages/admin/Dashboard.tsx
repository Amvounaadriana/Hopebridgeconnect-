
import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Settings, Users, Heart } from "lucide-react";
import { useNavigate } from "react-router-dom";

const AdminDashboard = () => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Welcome back, {userProfile?.displayName}</h1>
        <p className="text-muted-foreground">
          Here's a summary of your orphanage's current status
        </p>
      </div>

      {/* Remove the mock metrics section */}

      {/* Remove the Recent Activities and Quick Actions cards */}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <Button 
              variant="outline" 
              className="h-auto py-4 flex flex-col items-center justify-center gap-2"
              onClick={() => navigate("/admin/orphanage/create")}
            >
              <Settings className="h-6 w-6" />
              <span>Create Orphanage</span>
            </Button>
            
            <Button 
              variant="outline" 
              className="h-auto py-4 flex flex-col items-center justify-center gap-2"
              onClick={() => navigate("/admin/children")}
            >
              <Users className="h-6 w-6" />
              <span>Manage Children</span>
            </Button>
            
            <Button 
              variant="outline" 
              className="h-auto py-4 flex flex-col items-center justify-center gap-2"
              onClick={() => navigate("/admin/wishes")}
            >
              <Heart className="h-6 w-6" />
              <span>Manage Wishes</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;



