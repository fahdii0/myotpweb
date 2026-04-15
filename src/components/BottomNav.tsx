import { Link, useLocation } from "react-router-dom";
import { Home, History, User, ShieldCheck, Settings } from "lucide-react";

export default function BottomNav() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith("/admin");
  const token = localStorage.getItem("token");

  if (!token) return null;

  const navItems = isAdmin 
    ? [
        { icon: Home, label: "Dashboard", path: "/admin/dashboard" },
        { icon: User, label: "Users", path: "/admin/dashboard" }, // Can scroll to users
        { icon: ShieldCheck, label: "Security", path: "/admin/dashboard" },
      ]
    : [
        { icon: Home, label: "Home", path: "/" },
        { icon: History, label: "History", path: "/" }, // Can scroll to history
        { icon: Settings, label: "Profile", path: "/" },
      ];

  return (
    <div className="bottom-nav md:hidden">
      {navItems.map((item, index) => {
        const isActive = location.pathname === item.path;
        return (
          <Link 
            key={index} 
            to={item.path} 
            className={`nav-item ${isActive ? "active" : ""}`}
            onClick={() => {
              if (item.label === "History" || item.label === "Users") {
                // Scroll logic could go here if needed
              }
            }}
          >
            <item.icon className="w-5 h-5" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
