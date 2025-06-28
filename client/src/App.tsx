import React, { useState, useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { queryClient } from "./lib/queryClient";
import StreamlinedHomepage from "./components/StreamlinedHomepage";
import StreamlinedClientPage from "./components/StreamlinedClientPage";
import LoginGate from "./components/LoginGate";
import "./index.css";

type View = "home" | "client";

function App() {
  const [currentView, setCurrentView] = useState<View>("home");
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(
    null,
  );
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    // Check if user is already authenticated
    const authStatus = sessionStorage.getItem('authenticated');
    setIsAuthenticated(authStatus === 'true');
    setIsCheckingAuth(false);
  }, []);

  const handleSelectProject = (projectId: number) => {
    setSelectedProjectId(projectId);
    setCurrentView("client");
  };

  const handleBackToHome = () => {
    setCurrentView("home");
    setSelectedProjectId(null);
  };

  const handleAuthenticated = () => {
    setIsAuthenticated(true);
  };

  if (isCheckingAuth) {
    return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <div className="min-h-screen flex items-center justify-center bg-background">
            <div>Loading...</div>
          </div>
        </ThemeProvider>
      </QueryClientProvider>
    );
  }

  if (!isAuthenticated) {
    return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <LoginGate onAuthenticated={handleAuthenticated} />
        </ThemeProvider>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        <div className="min-h-screen bg-background">
          {currentView === "home" && (
            <StreamlinedHomepage onSelectProject={handleSelectProject} />
          )}

          {currentView === "client" && selectedProjectId && (
            <StreamlinedClientPage
              projectId={selectedProjectId}
              onBack={handleBackToHome}
            />
          )}
        </div>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
