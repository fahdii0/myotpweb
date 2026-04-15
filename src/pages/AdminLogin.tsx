import { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import axios from "axios";
import { ShieldAlert, Loader2 } from "lucide-react";

export default function AdminLogin() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post("/api/auth/admin-login", { password });
      localStorage.setItem("token", res.data.token);
      toast.success("Admin login successful!");
      navigate("/admin/dashboard");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-12">
      <div className="mobile-panel">
        <div className="panel-header flex-col items-center py-8 gap-2">
          <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.4)] mb-2">
            <ShieldAlert className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-black tracking-tighter text-center uppercase">Admin_Access</h1>
          <p className="text-[10px] text-center text-[var(--muted-foreground)] uppercase tracking-widest">
            Restricted Terminal
          </p>
        </div>
        <form onSubmit={handleLogin}>
          <div className="panel-content space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password" title="Password" className="text-[10px] uppercase tracking-widest text-[var(--muted-foreground)]">Master Key</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                className="glass-input h-12"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full h-14 immersive-btn-primary mt-4" disabled={loading}>
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "VERIFY_AUTHORITY"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
