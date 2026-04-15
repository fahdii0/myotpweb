import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import axios from "axios";
import { RefreshCw, Mail, Copy, CheckCircle2, Loader2, History, DollarSign, PlusCircle, XCircle, MessageCircle } from "lucide-react";

const DOMAINS = ["gmail.com"];

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [selectedDomain, setSelectedDomain] = useState(DOMAINS[0]);
  const [loading, setLoading] = useState(false);
  const [activePurchase, setActivePurchase] = useState<any>(null);
  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }
    try {
      const [userRes, purchasesRes] = await Promise.all([
        axios.get("/api/user/profile", { headers: { Authorization: `Bearer ${token}` } }),
        axios.get("/api/user/purchases", { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setUser(userRes.data);
      setPurchases(purchasesRes.data.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      
      // Check for waiting purchase
      const waiting = purchasesRes.data.find((p: any) => p.status === "waiting" || p.status === "received");
      if (waiting) setActivePurchase(waiting);
    } catch (err) {
      localStorage.removeItem("token");
      navigate("/login");
    }
  }, [navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-check for code
  useEffect(() => {
    let interval: any;
    if (activePurchase && activePurchase.status === "waiting") {
      interval = setInterval(async () => {
        try {
          const token = localStorage.getItem("token");
          const res = await axios.get(`/api/smsbower/check-code?mailId=${activePurchase.mailId}&purchaseId=${activePurchase.id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.data.code) {
            setActivePurchase((prev: any) => ({ ...prev, verificationCode: res.data.code, status: "received" }));
            toast.success("Verification code received!");
            fetchData();
          }
        } catch (err: any) {
          const errorMsg = err.response?.data?.error || err.message || "Connection error";
          console.error("Check code error:", errorMsg);
          
          if (errorMsg.toLowerCase().includes("cancel") || errorMsg.toLowerCase().includes("expired")) {
            toast.error(errorMsg);
            setActivePurchase(null);
            fetchData();
          }
        }
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [activePurchase, fetchData]);

  const handleBuy = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post("/api/smsbower/buy", { domain: selectedDomain }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setActivePurchase(res.data);
      toast.success("Email purchased successfully!");
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Purchase failed");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!activePurchase) return;
    try {
      const token = localStorage.getItem("token");
      await axios.post("/api/smsbower/cancel", { 
        mailId: activePurchase.mailId, 
        purchaseId: activePurchase.id 
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setActivePurchase(null);
      toast.success("Activation cancelled!");
      fetchData();
    } catch (err) {
      toast.error("Failed to cancel activation");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.info("Copied to clipboard");
  };

  if (!user) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Balance Panel */}
      <div className="mobile-panel bg-gradient-to-br from-[var(--primary)] to-[#4a00ff]">
        <div className="panel-content flex items-center justify-between py-8">
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/60 font-bold">Current Balance</p>
            <h2 className="text-4xl font-black tracking-tighter text-white">
              {user.balance} <span className="text-lg font-normal opacity-60">PKR</span>
            </h2>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button className="h-12 px-6 bg-white text-[var(--primary)] font-bold hover:bg-white/90 rounded-xl shadow-lg flex items-center gap-2">
                <PlusCircle className="w-5 h-5" />
                DEPOSIT
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[var(--card)] border-[var(--border)] text-white max-w-[90vw] rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-xl font-black tracking-tight text-center">ADD_FUNDS</DialogTitle>
                <DialogDescription className="text-[var(--muted-foreground)] text-xs text-center">
                  Contact admin to deposit balance into your account.
                </DialogDescription>
              </DialogHeader>
              <div className="py-6 flex flex-col items-center space-y-6">
                <div className="w-20 h-20 rounded-full bg-[#25D366]/10 flex items-center justify-center border border-[#25D366]/30 shadow-[0_0_30px_rgba(37,211,102,0.2)]">
                  <MessageCircle className="w-10 h-10 text-[#25D366]" />
                </div>
                <div className="text-center space-y-2">
                  <p className="text-sm text-[var(--muted-foreground)] uppercase tracking-widest font-bold">Admin WhatsApp</p>
                  <p className="text-2xl font-black text-white tracking-tighter">+92 309 3601043</p>
                </div>
                <Button 
                  onClick={() => window.open("https://wa.me/923093601043", "_blank")}
                  className="w-full h-14 bg-[#25D366] hover:bg-[#20ba5a] text-white font-bold text-sm tracking-widest flex items-center justify-center gap-2 rounded-xl"
                >
                  <MessageCircle className="w-5 h-5" />
                  CONTACT ON WHATSAPP
                </Button>
                <p className="text-[10px] text-[var(--muted-foreground)] text-center italic">
                  "Please send your username and payment proof for instant deposit."
                </p>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <div className="px-5 py-3 bg-black/20 flex justify-between items-center">
          <span className="text-[10px] text-white/40 uppercase tracking-widest">Total Spent: {user.totalSpent} PKR</span>
          <div className="flex items-center gap-1">
            <div className="status-dot status-dot-active" />
            <span className="text-[10px] text-[var(--success)] font-bold uppercase tracking-widest">Secure</span>
          </div>
        </div>
      </div>

      {/* Main Action Panel */}
      <div className="mobile-panel">
        <div className="panel-header">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-[var(--accent)]" />
            <span className="text-xs font-bold uppercase tracking-widest">Activation Panel</span>
          </div>
          <Badge variant="outline" className="text-[10px] border-[var(--border)] text-[var(--muted-foreground)]">
            Service: FB
          </Badge>
        </div>
        <div className="panel-content space-y-6">
          {!activePurchase ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest text-[var(--muted-foreground)] font-bold">Select Domain</label>
                <Select value={selectedDomain} onValueChange={setSelectedDomain}>
                  <SelectTrigger className="glass-input h-12">
                    <SelectValue placeholder="Select domain" />
                  </SelectTrigger>
                  <SelectContent className="bg-[var(--card)] border-[var(--border)] text-white">
                    {DOMAINS.map(d => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleBuy} disabled={loading} className="w-full h-14 immersive-btn-primary text-sm tracking-widest">
                {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <PlusCircle className="w-5 h-5 mr-2" />}
                GENERATE EMAIL (25 PKR)
              </Button>
            </div>
          ) : (
            <div className="space-y-6 py-2">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="relative">
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center border-2 border-[var(--accent)] bg-[var(--accent)]/10 shadow-[0_0_30px_rgba(0,242,255,0.2)] ${activePurchase.status === "waiting" ? "animate-pulse" : ""}`}>
                    <RefreshCw className={`w-8 h-8 text-[var(--accent)] ${activePurchase.status === "waiting" ? "animate-spin" : ""}`} />
                  </div>
                  <div className="absolute -bottom-1 -right-1 bg-[var(--card)] p-1 rounded-full border border-[var(--border)]">
                    <div className="status-dot status-dot-active" />
                  </div>
                </div>
                
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-widest text-[var(--muted-foreground)]">Active Email</p>
                  <div className="flex items-center gap-2 bg-white/5 px-4 py-3 rounded-xl border border-[var(--border)]">
                    <span className="font-mono text-lg text-[var(--accent)] font-bold">{activePurchase.emailAddress}</span>
                    <Button variant="ghost" size="icon" onClick={() => copyToClipboard(activePurchase.emailAddress)} className="h-8 w-8 text-[var(--muted-foreground)]">
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {activePurchase.verificationCode ? (
                  <div className="w-full space-y-2 animate-in fade-in zoom-in duration-500">
                    <p className="text-[10px] uppercase tracking-widest text-[var(--success)] font-bold">Code Received</p>
                    <div className="bg-[var(--success)]/10 border border-[var(--success)]/30 p-6 rounded-2xl flex flex-col items-center gap-3">
                      <span className="text-5xl font-black tracking-[0.2em] text-white font-mono drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                        {activePurchase.verificationCode}
                      </span>
                      <Button variant="ghost" size="sm" onClick={() => copyToClipboard(activePurchase.verificationCode)} className="text-[var(--success)] h-8">
                        <Copy className="w-3 h-3 mr-2" /> Copy Code
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-[10px] text-[var(--muted-foreground)] animate-pulse">Waiting for verification code...</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {activePurchase.status === "received" ? (
                  <Button onClick={() => setActivePurchase(null)} className="col-span-2 h-12 bg-[var(--accent)] text-black font-bold hover:bg-[#00e1ff]">
                    <PlusCircle className="w-4 h-4 mr-2" />
                    Buy New Email
                  </Button>
                ) : (
                  <>
                    <Button variant="outline" onClick={() => fetchData()} className="h-12 border-[var(--border)] bg-white/5 hover:bg-white/10 text-white">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Refresh
                    </Button>
                    <Button variant="outline" onClick={handleCancel} className="h-12 border-red-500/50 bg-red-500/10 hover:bg-red-500/20 text-red-500">
                      <XCircle className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                  </>
                )}
                <Button variant="outline" onClick={() => copyToClipboard(activePurchase.emailAddress)} className="col-span-2 h-12 border-[var(--border)] bg-white/5 hover:bg-white/10 text-white">
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Mail
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* History Panel */}
      <div className="mobile-panel">
        <div className="panel-header">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-[var(--muted-foreground)]" />
            <span className="text-xs font-bold uppercase tracking-widest">Recent Activity</span>
          </div>
          <span className="text-[10px] text-[var(--muted-foreground)]">{purchases.length} Total</span>
        </div>
        <div className="panel-content p-0">
          <div className="divide-y divide-[var(--border)]">
            {purchases.length === 0 ? (
              <div className="p-10 text-center text-[var(--muted-foreground)] text-xs opacity-40">No activity yet</div>
            ) : (
              purchases.map((p: any) => (
                <div key={p.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-white truncate max-w-[180px]">{p.emailAddress}</p>
                    <p className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-widest">{p.domain} • {new Date(p.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {p.verificationCode ? (
                      <span className="text-sm font-mono font-bold text-[var(--success)]">{p.verificationCode}</span>
                    ) : (
                      <Badge variant="outline" className="text-[9px] h-5 border-[var(--border)] text-[var(--muted-foreground)]">
                        {p.status}
                      </Badge>
                    )}
                    <span className="text-[10px] font-bold text-white/40">25 PKR</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="text-center space-y-2 pb-8">
        <p className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-[0.3em] opacity-40">System Secure • v2.1.0</p>
        <div className="flex justify-center gap-4">
          <div className="flex items-center gap-1">
            <div className="status-dot status-dot-active" />
            <span className="text-[9px] text-[var(--muted-foreground)] uppercase font-bold">API Online</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="status-dot status-dot-active" />
            <span className="text-[9px] text-[var(--muted-foreground)] uppercase font-bold">DB Secure</span>
          </div>
        </div>
      </div>
    </div>
  );
}
