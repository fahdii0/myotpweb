import { useState, FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import axios from "axios";
import { Loader2 } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post("/api/auth/login", { email, password });
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      toast.success("Login successful!");
      navigate("/dashboard");
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
          <div className="w-12 h-12 bg-[var(--primary)] rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.4)] mb-2">
            <span className="font-black text-white text-xl">FB</span>
          </div>
          <h1 className="text-2xl font-black tracking-tighter text-center uppercase">System_Login</h1>
          <p className="text-[10px] text-center text-[var(--muted-foreground)] uppercase tracking-widest">
            Secure Terminal Access
          </p>
        </div>
        <form onSubmit={handleLogin}>
          <div className="panel-content space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[10px] uppercase tracking-widest text-[var(--muted-foreground)]">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                className="glass-input h-12"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" title="Password" className="text-[10px] uppercase tracking-widest text-[var(--muted-foreground)]">Access Key</Label>
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
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "AUTHENTICATE"}
            </Button>
            
            <div className="pt-4 text-center">
              <p className="text-xs text-[var(--muted-foreground)]">
                Don't have an account?{" "}
                <Link to="/register" className="text-[var(--accent)] font-bold hover:underline">
                  Register
                </Link>
              </p>
            </div>
          </div>
        </form>
      </div>
      <div className="mt-8 text-center">
        <Link to="/admin/login" className="text-[10px] text-[var(--muted-foreground)] opacity-20 hover:opacity-100 uppercase tracking-[0.3em] transition-opacity">
          Admin_Terminal
        </Link>
      </div>
    </div>
  );
}
