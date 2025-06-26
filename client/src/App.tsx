import React, { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import StreamlinedHomepage from "./components/StreamlinedHomepage";
import StreamlinedClientPage from "./components/StreamlinedClientPage";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

type View = "home" | "client";

function App() {
  const [currentView, setCurrentView] = useState<View>("home");
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(
    null,
  );

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
