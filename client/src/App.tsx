import React, { useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { queryClient } from "./lib/queryClient";
import StreamlinedHomepage from "./components/StreamlinedHomepage";
import StreamlinedClientPage from "./components/StreamlinedClientPage";
import LoginForm from "./components/auth/LoginForm";
import AdminDashboard from "./components/admin/AdminDashboard";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { Toaster } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { LogOut, Settings } from "lucide-react";
import "./index.css";

type View = "home" | "client" | "admin";

function AppContent() {
  const { user, logout, isLoading } = useAuth();
  const [currentView, setCurrentView] = useState<View>("home");
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);

  const handleSelectProject = (projectId: number) => {
    setSelectedProjectId(projectId);
    setCurrentView("client");
  };

  const handleBackToHome = () => {
    setCurrentView("home");
    setSelectedProjectId(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <LoginForm />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header with user info and logout */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <img src="/aframe-logo.png" alt="A-Frame Painting" className="h-8 w-auto" />
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">{user.firstName} {user.lastName}</span>
              <span className={`text-xs px-2 py-1 rounded ${
                user.role === 'admin' 
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' 
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
              }`}>
                {user.role}
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {user.role === 'admin' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentView(currentView === 'admin' ? 'home' : 'admin')}
              >
                <Settings className="h-4 w-4 mr-1" />
                {currentView === 'admin' ? 'Projects' : 'Admin'}
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={logout}>
              <LogOut className="h-4 w-4 mr-1" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main>
        {currentView === "home" && (
          <StreamlinedHomepage onSelectProject={handleSelectProject} />
        )}

        {currentView === "client" && selectedProjectId && (
          <StreamlinedClientPage
            projectId={selectedProjectId}
            onBack={handleBackToHome}
          />
        )}

        {currentView === "admin" && user.role === 'admin' && (
          <AdminDashboard />
        )}
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        <AuthProvider>
          <AppContent />
          <Toaster />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
