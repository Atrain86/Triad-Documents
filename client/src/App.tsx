import React, { useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { queryClient } from "./lib/queryClient";
import StreamlinedHomepage from "./components/StreamlinedHomepage";
import SimpleClientPage from "./components/SimpleClientPage";
import { Toaster } from "@/components/ui/toaster";
import "./index.css";

type View = "home" | "client";

function App() {
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

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        <div className="min-h-screen bg-background">
          {/* Main content */}
          <main>
            {currentView === "home" && (
              <StreamlinedHomepage onSelectProject={handleSelectProject} />
            )}

            {currentView === "client" && selectedProjectId && (
              <SimpleClientPage
                projectId={selectedProjectId}
                onBack={handleBackToHome}
              />
            )}
          </main>
          <Toaster />
        </div>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
