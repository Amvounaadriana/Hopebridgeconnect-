import React from "react";
import { RouteObject } from "react-router-dom";
import AdminLayout from "./layouts/AdminLayout";
import DonorLayout from "./layouts/DonorLayout";
import VolunteerLayout from "./layouts/VolunteerLayout";
import ProtectedRoute from "./components/ProtectedRoute";

// Page imports
import Welcome from "./pages/Welcome";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import AdminDashboard from "./pages/admin/Dashboard";
import DonorDashboard from "./pages/donor/Dashboard";
import VolunteerDashboard from "./pages/volunteer/Dashboard";
import AdminChildren from "./pages/admin/Children";
import AdminOrphanage from "./pages/admin/Orphanage";
import AdminAllOrphanages from "./pages/admin/AllOrphanages";
import AdminSOS from "./pages/admin/SOS";
import DonorOrphanages from "./pages/donor/Orphanages";
import DonorOrphanageDetails from "./pages/donor/OrphanageDetails";
import DonorChat from "./pages/donor/Chat";
import DonateForm from "./pages/donor/DonateForm";
import PaymentSuccess from "./pages/donor/PaymentSuccess";
import VolunteerSOS from "./pages/volunteer/SOS";
import VolunteerChat from "./pages/volunteer/Chat";
import VolunteerTasks from "./pages/volunteer/Tasks";
import VolunteerProfile from "./pages/volunteer/Profile";
import VolunteerCertificates from "./pages/volunteer/Certificates";
import CreateOrphanage from "./pages/admin/CreateOrphanage";
import AddChild from "./pages/admin/AddChild";
import AdminWishes from "./pages/admin/Wishes";
import WishesTest from "./pages/admin/WishesTest";
import AdminPayments from "./pages/admin/Payments";
import AdminVolunteers from "./pages/admin/Volunteers";
import VolunteerDetail from "./pages/admin/VolunteerDetail";
import AdminChat from "./pages/admin/Chat";
import VolunteerCalendar from "./pages/volunteer/Calendar";
import DonorSponsorships from "./pages/donor/Sponsorships";
import SponsorshipForm from "./pages/donor/SponsorshipForm";
import ChildDetails from "./pages/admin/ChildDetails";
import NotFound from "./pages/NotFound";
import VerifyEmail from "./pages/VerifyEmail";
import Wishes from "./pages/donor/Wishes";
import ForgotPassword from "./pages/ForgotPassword";
import WishDetails from "./pages/donor/WishDetails";

// Create the VolunteerCalendar component for admin
import VolunteerCalendarAdmin from "./pages/admin/VolunteerCalendar";

const routes: RouteObject[] = [
  {
    path: "/",
    element: <Welcome />
  },
  {
    path: "/verify-email",
    element: <VerifyEmail />
  },
  {
    path: "/signin",
    element: <SignIn />
  },
  {
    path: "/signup",
    element: <SignUp />
  },
  {
    path: "/admin/dashboard",
    element: (
      <ProtectedRoute allowedRoles={["admin"]}>
        <AdminLayout>
          <AdminDashboard />
        </AdminLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: "/donor/dashboard",
    element: (
      <ProtectedRoute allowedRoles={["donor"]}>
        <DonorLayout>
          <DonorDashboard />
        </DonorLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: "/volunteer/dashboard",
    element: (
      <ProtectedRoute allowedRoles={["volunteer"]}>
        <VolunteerLayout>
          <VolunteerDashboard />
        </VolunteerLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: "/admin/children",
    element: (
      <ProtectedRoute allowedRoles={["admin"]}>
        <AdminLayout>
          <AdminChildren />
        </AdminLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: "/admin/children/:childId",
    element: (
      <ProtectedRoute allowedRoles={["admin"]}>
        <AdminLayout>
          <ChildDetails />
        </AdminLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: "/donor/orphanages",
    element: (
      <ProtectedRoute allowedRoles={["donor"]}>
        <DonorLayout>
          <DonorOrphanages />
        </DonorLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: "/donor/orphanages/:orphanageId",
    element: (
      <ProtectedRoute allowedRoles={["donor"]}>
        <DonorLayout>
          <DonorOrphanageDetails />
        </DonorLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: "/donor/donate/:orphanageId",
    element: (
      <ProtectedRoute allowedRoles={["donor"]}>
        <DonorLayout>
          <DonateForm />
        </DonorLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: "/donor/payment-success",
    element: (
      <ProtectedRoute allowedRoles={["donor"]}>
        <DonorLayout>
          <PaymentSuccess />
        </DonorLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: "/donor/chat",
    element: (
      <ProtectedRoute allowedRoles={["donor"]}>
        <DonorLayout>
          <DonorChat />
        </DonorLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: "/admin/orphanage",
    element: (
      <ProtectedRoute allowedRoles={["admin"]}>
        <AdminLayout>
          <AdminOrphanage />
        </AdminLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: "/admin/all-orphanages",
    element: (
      <ProtectedRoute allowedRoles={["admin"]}>
        <AdminLayout>
          <AdminAllOrphanages />
        </AdminLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: "/admin/sos",
    element: (
      <ProtectedRoute allowedRoles={["admin"]}>
        <AdminLayout>
          <AdminSOS />
        </AdminLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: "/volunteer/sos",
    element: (
      <ProtectedRoute allowedRoles={["volunteer"]}>
        <VolunteerLayout>
          <VolunteerSOS />
        </VolunteerLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: "/volunteer/chat",
    element: (
      <ProtectedRoute allowedRoles={["volunteer"]}>
        <VolunteerLayout>
          <VolunteerChat />
        </VolunteerLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: "/volunteer/tasks",
    element: (
      <ProtectedRoute allowedRoles={["volunteer"]}>
        <VolunteerLayout>
          <VolunteerTasks />
        </VolunteerLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: "/volunteer/profile",
    element: (
      <ProtectedRoute allowedRoles={["volunteer"]}>
        <VolunteerLayout>
          <VolunteerProfile />
        </VolunteerLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: "/volunteer/certificates",
    element: (
      <ProtectedRoute allowedRoles={["volunteer"]}>
        <VolunteerLayout>
          <VolunteerCertificates />
        </VolunteerLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: "/admin/orphanage/create",
    element: (
      <ProtectedRoute allowedRoles={["admin"]}>
        <AdminLayout>
          <CreateOrphanage />
        </AdminLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: "/admin/children/new",
    element: (
      <ProtectedRoute allowedRoles={["admin"]}>
        <AdminLayout>
          <AddChild />
        </AdminLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: "/admin/wishes",
    element: (
      <ProtectedRoute allowedRoles={["admin"]}>
        <AdminLayout>
          <AdminWishes />
        </AdminLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: "/admin/wishes-test",
    element: (
      <ProtectedRoute allowedRoles={["admin"]}>
        <AdminLayout>
          <WishesTest />
        </AdminLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: "/admin/payments",
    element: (
      <ProtectedRoute allowedRoles={["admin"]}>
        <AdminLayout>
          <AdminPayments />
        </AdminLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: "/admin/volunteers",
    element: (
      <ProtectedRoute allowedRoles={["admin"]}>
        <AdminLayout>
          <AdminVolunteers />
        </AdminLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: "/admin/volunteers/:id",
    element: (
      <ProtectedRoute allowedRoles={["admin"]}>
        <AdminLayout>
          <VolunteerDetail />
        </AdminLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: "/admin/chat",
    element: (
      <ProtectedRoute allowedRoles={["admin"]}>
        <AdminLayout>
          <AdminChat />
        </AdminLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: "/volunteer/calendar",
    element: (
      <ProtectedRoute allowedRoles={["volunteer"]}>
        <VolunteerLayout>
          <VolunteerCalendar />
        </VolunteerLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: "/donor/sponsorships",
    element: (
      <ProtectedRoute allowedRoles={["donor"]}>
        <DonorLayout>
          <DonorSponsorships />
        </DonorLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: "/donor/orphanages/:orphanageId/sponsor",
    element: (
      <ProtectedRoute allowedRoles={["donor"]}>
        <DonorLayout>
          <SponsorshipForm />
        </DonorLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: "/admin/calendar",
    element: (
      <ProtectedRoute allowedRoles={["admin"]}>
        <AdminLayout>
          <VolunteerCalendarAdmin />
        </AdminLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: "/donor/wishes",
    element: (
      <ProtectedRoute allowedRoles={["donor"]}>
        <DonorLayout>
          <Wishes />
        </DonorLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: "/donor/wish/:wishId",
    element: (
      <ProtectedRoute allowedRoles={["donor"]}>
        <DonorLayout>
          <WishDetails />
        </DonorLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: "/forgot-password",
    element: <ForgotPassword />
  },
  {
    path: "*",
    element: <NotFound />
  }
];

export default routes;
