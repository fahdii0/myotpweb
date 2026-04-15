import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import axios from "axios";
import { Users, DollarSign, ShoppingBag, Search, PlusCircle, Loader2, ArrowUpRight, RefreshCw, ShieldCheck, Download } from "lucide-react";

export default function AdminDashboard() {
  const [users, setUsers] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [purchaseSearch, setPurchaseSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [addAmount, setAddAmount] = useState("");
  const [addingBalance, setAddingBalance] = useState(false);
  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/admin/login");
      return;
    }
    try {
      const [usersRes, statsRes, purchasesRes] = await Promise.all([
        axios.get("/api/admin/users", { headers: { Authorization: `Bearer ${token}` } }),
        axios.get("/api/admin/stats", { headers: { Authorization: `Bearer ${token}` } }),
        axios.get("/api/admin/purchases", { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setUsers(usersRes.data);
      setStats(statsRes.data);
      setPurchases(purchasesRes.data);
    } catch (err) {
      localStorage.removeItem("token");
      navigate("/admin/login");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddBalance = async () => {
    if (!selectedUser || !addAmount) return;
    setAddingBalance(true);
    try {
      const token = localStorage.getItem("token");
      await axios.post("/api/admin/add-balance", { 
        email: selectedUser.email, 
        amount: addAmount 
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`Added ${addAmount} PKR to ${selectedUser.email}`);
      setAddAmount("");
      setSelectedUser(null);
      fetchData();
    } catch (err) {
      toast.error("Failed to add balance");
    } finally {
      setAddingBalance(false);
    }
  };

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPurchases = purchases.filter(p => 
    p.userEmail.toLowerCase().includes(purchaseSearch.toLowerCase()) || 
    p.emailAddress.toLowerCase().includes(purchaseSearch.toLowerCase())
  );

  const handleDownloadProject = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    
    try {
      const response = await axios.get("/api/admin/download-project", {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob"
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "fb-verifier-project.zip");
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Project ZIP downloaded successfully");
    } catch (err) {
      toast.error("Failed to download project ZIP");
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-amber-600" /></div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={handleDownloadProject} className="text-[var(--muted-foreground)] hover:text-white">
            <Download className="w-4 h-4" />
          </Button>
          <h1 className="text-xl font-black tracking-tighter bg-gradient-to-r from-[var(--accent)] to-[var(--primary)] bg-clip-text text-transparent uppercase">Admin_Terminal</h1>
        </div>
        <Button variant="ghost" size="icon" onClick={() => fetchData()} className="text-[var(--muted-foreground)]">
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="stat-card">
          <span className="stat-label">Total Users</span>
          <div className="flex items-end justify-between">
            <span className="stat-value">{stats?.totalUsers || 0}</span>
            <Users className="w-4 h-4 text-[var(--accent)] mb-1" />
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-label">Revenue</span>
          <div className="flex items-end justify-between">
            <span className="stat-value text-[var(--success)]">{stats?.totalRevenue || 0}</span>
            <DollarSign className="w-4 h-4 text-[var(--success)] mb-1" />
          </div>
        </div>
        <div className="stat-card col-span-2">
          <span className="stat-label">Successful Activations</span>
          <div className="flex items-end justify-between">
            <span className="stat-value">{stats?.totalPurchases || 0}</span>
            <ShoppingBag className="w-4 h-4 text-[var(--primary)] mb-1" />
          </div>
        </div>
      </div>

      {/* User Management Panel */}
      <div className="mobile-panel">
        <div className="panel-header">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[var(--accent)]" />
            <span className="text-xs font-bold uppercase tracking-widest">User Management</span>
          </div>
        </div>
        <div className="panel-content space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
            <Input 
              placeholder="Search users..." 
              className="glass-input pl-10 h-11 text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="divide-y divide-[var(--border)] border border-[var(--border)] rounded-xl overflow-hidden">
            {filteredUsers.length === 0 ? (
              <div className="p-10 text-center text-[var(--muted-foreground)] text-xs opacity-40">No users found</div>
            ) : (
              filteredUsers.map((u: any) => (
                <div key={u.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-white">{u.username}</p>
                    <p className="text-[10px] text-[var(--muted-foreground)] truncate max-w-[150px]">{u.email}</p>
                    <div className="flex gap-2">
                      <p className="text-[10px] font-bold text-[var(--success)]">{u.balance} PKR</p>
                      <p className="text-[10px] font-bold text-[var(--primary)]">Spent: {u.totalSpent || 0} PKR</p>
                    </div>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" onClick={() => setSelectedUser(u)} className="h-8 text-[10px] border-[var(--border)] bg-white/5 font-bold uppercase tracking-widest">
                        Add Funds
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-[var(--card)] border-[var(--border)] text-white max-w-[90vw] rounded-2xl">
                      <DialogHeader>
                        <DialogTitle className="text-lg font-black tracking-tight">ADD_FUNDS</DialogTitle>
                        <DialogDescription className="text-[var(--muted-foreground)] text-xs">
                          Inject balance into {u.username}'s account.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="amount" className="text-[10px] uppercase tracking-widest text-[var(--muted-foreground)]">Amount (PKR)</Label>
                          <Input 
                            id="amount" 
                            type="number" 
                            placeholder="e.g. 500" 
                            className="glass-input h-12"
                            value={addAmount}
                            onChange={(e) => setAddAmount(e.target.value)}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button onClick={handleAddBalance} disabled={addingBalance || !addAmount} className="w-full h-12 immersive-btn-primary">
                          {addingBalance ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ArrowUpRight className="w-4 h-4 mr-2" />}
                          CONFIRM_INJECTION
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* User Activity Panel */}
      <div className="mobile-panel">
        <div className="panel-header">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-[var(--primary)]" />
            <span className="text-xs font-bold uppercase tracking-widest">User Activity</span>
          </div>
        </div>
        <div className="panel-content space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
            <input 
              placeholder="Search purchases..." 
              className="glass-input pl-10 h-11 text-sm w-full outline-none"
              value={purchaseSearch}
              onChange={(e) => setPurchaseSearch(e.target.value)}
            />
          </div>

          <div className="divide-y divide-[var(--border)] border border-[var(--border)] rounded-xl overflow-hidden">
            {filteredPurchases.length === 0 ? (
              <div className="p-10 text-center text-[var(--muted-foreground)] text-xs opacity-40">No activity found</div>
            ) : (
              filteredPurchases.map((p: any) => (
                <div key={p.id} className="p-4 space-y-2 hover:bg-white/5 transition-colors">
                  <div className="flex justify-between items-start">
                    <div className="space-y-0.5">
                      <p className="text-[10px] font-bold text-[var(--accent)] uppercase tracking-widest">{p.userEmail}</p>
                      <p className="text-xs font-bold text-white">{p.emailAddress}</p>
                    </div>
                    <Badge variant="outline" className={`text-[8px] uppercase tracking-widest ${
                      p.status === "received" ? "border-[var(--success)] text-[var(--success)]" :
                      p.status === "expired" ? "border-red-500 text-red-500" :
                      p.status === "cancelled" ? "border-amber-500 text-amber-500" :
                      "border-[var(--muted-foreground)] text-[var(--muted-foreground)]"
                    }`}>
                      {p.status}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-[var(--muted-foreground)]">Code:</span>
                      <span className="text-[10px] font-mono font-bold text-white">{p.verificationCode || "---"}</span>
                    </div>
                    <span className="text-[10px] text-[var(--muted-foreground)]">{new Date(p.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* System Status Panel */}
      <div className="mobile-panel">
        <div className="panel-header">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[var(--success)]" />
            <span className="text-xs font-bold uppercase tracking-widest">System Health</span>
          </div>
        </div>
        <div className="panel-content space-y-4">
          <div className="space-y-3">
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-[var(--muted-foreground)] uppercase tracking-widest">API Connection</span>
              <span className="text-[var(--success)] font-bold">STABLE</span>
            </div>
            <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
              <div className="w-[98%] h-full bg-[var(--success)]" />
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-[var(--muted-foreground)] uppercase tracking-widest">Database Load</span>
              <span className="text-[var(--accent)] font-bold">OPTIMAL</span>
            </div>
            <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
              <div className="w-[15%] h-full bg-[var(--accent)]" />
            </div>
          </div>
        </div>
      </div>

      <div className="text-center py-8 opacity-20">
        <p className="text-[8px] uppercase tracking-[0.5em] text-[var(--muted-foreground)]">Admin_Terminal_v2.1.0_Secure</p>
      </div>
    </div>
  );
}
