import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { APP_LOGO, APP_TITLE, getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { AlertCircle, BarChart3, CheckCircle2, ExternalLink, Loader2, LogOut, Plus, QrCode, Scan, Share2, XCircle } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [chainLength, setChainLength] = useState("100");

  const utils = trpc.useUtils();

  // Fetch user's chains
  const { data: chains, isLoading } = trpc.qr.list.useQuery();

  // Create chain mutation
  const createMutation = trpc.qr.create.useMutation({
    onSuccess: (data) => {
      toast.success("QR chain created successfully!");
      setCreateDialogOpen(false);
      setName("");
      setDescription("");
      setChainLength("100");
      utils.qr.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Deactivate chain mutation
  const deactivateMutation = trpc.qr.deactivate.useMutation({
    onSuccess: () => {
      toast.success("Chain deactivated");
      utils.qr.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleCreate = () => {
    if (!name.trim()) {
      toast.error("Please enter a name");
      return;
    }

    const length = parseInt(chainLength, 10);
    if (isNaN(length) || length < 10 || length > 10000) {
      toast.error("Chain length must be between 10 and 10,000");
      return;
    }

    createMutation.mutate({
      name: name.trim(),
      description: description.trim() || undefined,
      chainLength: length,
    });
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-950 dark:to-blue-950 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>Please log in to access the dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <a href={getLoginUrl()}>Log In</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-950 dark:via-blue-950 dark:to-indigo-950">
      {/* Header */}
      <header className="border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/">
            <div className="flex items-center gap-3 cursor-pointer">
              {APP_LOGO && <img src={APP_LOGO} alt={APP_TITLE} className="h-8 w-8" />}
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                {APP_TITLE}
              </h1>
            </div>
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-600 dark:text-slate-300">
              {user.name || user.email}
            </span>
            <Button variant="ghost" size="sm" onClick={() => logout()} className="gap-2">
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Page Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold">My QR Chains</h2>
              <p className="text-slate-600 dark:text-slate-300 mt-1">
                Create and manage your morphing QR codes
              </p>
            </div>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="lg" className="gap-2">
                  <Plus className="w-5 h-5" />
                  Create New Chain
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New QR Chain</DialogTitle>
                  <DialogDescription>
                    Set up a new morphing QR code chain with custom parameters
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      placeholder="e.g., Event Tickets 2025"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Optional description of this chain's purpose"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="chainLength">Chain Length *</Label>
                    <Input
                      id="chainLength"
                      type="number"
                      min="10"
                      max="10000"
                      value={chainLength}
                      onChange={(e) => setChainLength(e.target.value)}
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Number of unique codes (10-10,000). Each code can be scanned once.
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setCreateDialogOpen(false)}
                    disabled={createMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreate}
                    disabled={createMutation.isPending}
                    className="gap-2"
                  >
                    {createMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        Create Chain
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="text-center py-12">
              <Loader2 className="w-12 h-12 animate-spin mx-auto text-blue-600" />
              <p className="text-slate-600 dark:text-slate-300 mt-4">Loading your chains...</p>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && chains?.length === 0 && (
            <Card className="border-dashed border-2">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <QrCode className="w-16 h-16 text-slate-400 mb-4" />
                <h3 className="text-xl font-semibold mb-2">No QR Chains Yet</h3>
                <p className="text-slate-600 dark:text-slate-300 mb-6 max-w-md">
                  Create your first morphing QR code chain to get started. Each chain can contain up to 10,000 unique codes.
                </p>
                <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Create Your First Chain
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Chains Grid */}
          {!isLoading && chains && chains.length > 0 && (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {chains.map((chain) => {
                const scanned = chain.chainLength - (chain.currentIndex + 1);
                const percentComplete = (scanned / chain.chainLength * 100).toFixed(0);
                
                return (
                  <Card key={chain.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{chain.name}</CardTitle>
                          {chain.description && (
                            <CardDescription className="mt-1 line-clamp-2">
                              {chain.description}
                            </CardDescription>
                          )}
                        </div>
                        {chain.isActive ? (
                          <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Stats */}
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-slate-500 dark:text-slate-400">Scanned</p>
                          <p className="text-lg font-semibold">{scanned}</p>
                        </div>
                        <div>
                          <p className="text-slate-500 dark:text-slate-400">Remaining</p>
                          <p className="text-lg font-semibold">{chain.currentIndex + 1}</p>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                          <span>Progress</span>
                          <span>{percentComplete}%</span>
                        </div>
                        <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
                            style={{ width: `${percentComplete}%` }}
                          />
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="space-y-2 pt-2">
                        <div className="flex gap-2">
                          <Link href={`/display?chain=${chain.id}`}>
                            <Button variant="default" size="sm" className="flex-1 gap-1">
                              <QrCode className="w-3 h-3" />
                              Display
                            </Button>
                          </Link>
                          <Link href={`/stats?chain=${chain.id}`}>
                            <Button variant="outline" size="sm" className="flex-1 gap-1">
                              <BarChart3 className="w-3 h-3" />
                              Stats
                            </Button>
                          </Link>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full gap-1"
                          onClick={() => {
                            const url = `${window.location.origin}/display?chain=${chain.id}`;
                            navigator.clipboard.writeText(url);
                            toast.success("Display link copied!");
                          }}
                        >
                          <Share2 className="w-3 h-3" />
                          Copy Display Link
                        </Button>
                      </div>

                      {chain.isActive && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                          onClick={() => {
                            if (confirm("Are you sure you want to deactivate this chain?")) {
                              deactivateMutation.mutate({ chainId: chain.id });
                            }
                          }}
                          disabled={deactivateMutation.isPending}
                        >
                          Deactivate
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Quick Links */}
          <div className="grid md:grid-cols-2 gap-6 pt-6">
            <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                  <Scan className="w-5 h-5" />
                  Test Scanner
                </CardTitle>
                <CardDescription className="text-blue-600 dark:text-blue-400">
                  Validate QR codes and see the morphing in action
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/scan">
                  <Button variant="outline" className="w-full gap-2">
                    Open Scanner <ExternalLink className="w-4 h-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 border-purple-200 dark:border-purple-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
                  <AlertCircle className="w-5 h-5" />
                  How It Works
                </CardTitle>
                <CardDescription className="text-purple-600 dark:text-purple-400">
                  Learn about the technology behind morphing QR codes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/">
                  <Button variant="outline" className="w-full gap-2">
                    View Documentation <ExternalLink className="w-4 h-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
