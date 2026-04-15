import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogOut, User, ShieldCheck } from "lucide-react";

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem("token");
  const userStr = localStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : null;
  const isAdmin = location.pathname.startsWith("/admin");

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate(isAdmin ? "/admin/login" : "/login");
  };

  return (
    <header className="h-16 px-4 flex items-center justify-between border-b border-[var(--border)] bg-[var(--card)]/80 backdrop-blur-xl sticky top-0 z-50">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-[var(--primary)] rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.4)]">
          <span className="font-black text-white text-sm">FB</span>
        </div>
        <Link to="/" className="font-extrabold text-lg tracking-tighter bg-gradient-to-r from-[var(--accent)] to-[var(--primary)] bg-clip-text text-transparent">
          VERIFIER_PRO
        </Link>
      </div>

      <div className="flex items-center gap-3">
        {token ? (
          <>
            {!isAdmin && user && (
              <div className="bg-white/5 px-3 py-1 rounded-full border border-[var(--border)] text-[10px] font-bold">
                <span className="text-[var(--accent)]">{user.balance}</span> PKR
              </div>
            )}
            <Button variant="ghost" size="icon" onClick={handleLogout} className="text-[var(--muted-foreground)] hover:text-red-500 h-8 w-8">
              <LogOut className="w-4 h-4" />
            </Button>
          </>
        ) : (
          <div className="flex gap-2">
            {!isAdmin && (
              <Button size="sm" asChild className="immersive-btn-primary h-8 text-xs">
                <Link to="/login">Login</Link>
              </Button>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
