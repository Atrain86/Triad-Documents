import React from "react";
import ReactDOM from "react-dom/client";
import ClientDetail from "../pages/ClientDetail";

function App() {
  return (
    <div style={{ display: "flex", gap: "2rem", padding: "2rem" }}>
      <div style={{ flex: 1 }}>
        <h2 className="text-xl font-bold mb-2">ClientDetail.tsx (Live)</h2>
        <ClientDetail />
      </div>
      <div style={{ flex: 1 }}>
        <h2 className="text-xl font-bold mb-2">Reference Screenshot</h2>
        <img
          src="../../paintbrain_rep/screenshots/clientdetails_components/clientdetailpage_full.jpg"
          alt="Client Detail Reference"
          style={{ width: "100%", border: "1px solid #ccc" }}
        />
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
