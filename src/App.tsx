import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import Navbar from "./components/Navbar";
import BottomNav from "./components/BottomNav";

export class ErrorBoundary extends React.Component {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("React Error Boundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "20px", color: "red", background: "#000" }}>
          <h2>Application Error</h2>
          <p>{String((this.state as any).error)}</p>
          <details style={{ color: "#fff", marginTop: "10px" }}>
            <summary>Error Details</summary>
            <pre>{JSON.stringify((this.state as any).error, null, 2)}</pre>
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}

function AppInner() {
  useEffect(() => {
    console.log("✅ App component mounted successfully");
    console.log("🔍 LocalStorage token:", !!localStorage.getItem("token"));
  }, []);

  return (
    <Router>
      <div className="min-h-screen flex flex-col pb-20 md:pb-0">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-6">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
        <BottomNav />
        <Toaster position="top-center" richColors />
      </div>
    </Router>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AppInner />
    </ErrorBoundary>
  );
}

export default App;
