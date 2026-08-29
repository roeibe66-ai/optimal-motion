"use client";

import { AuthProvider, useAuth } from "@/app/context/AuthContext";
import LandingPage from "@/app/components/marketing/LandingPage";
import LoginPage from "@/app/components/marketing/LoginPage";
import RegisterPage from "@/app/components/marketing/RegisterPage";
import ResetPasswordPage from "@/app/components/marketing/ResetPasswordPage";
import PatientShell from "@/app/components/patient/PatientShell";
import LegacyAdminApp from "@/app/components/admin/LegacyAdminApp";

function AppRouter() {
  const { currentView } = useAuth();

  switch (currentView) {
    case "landing":
      return <LandingPage />;
    case "login":
      return <LoginPage />;
    case "register":
      return <RegisterPage />;
    case "reset_password":
      return <ResetPasswordPage />;
    case "patient":
      return <PatientShell />;
    case "admin":
      return <LegacyAdminApp />;
    default:
      return null;
  }
}

export default function Home() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}
