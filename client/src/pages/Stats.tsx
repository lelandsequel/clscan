import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { AlertCircle, ArrowLeft, BarChart3, CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "wouter";

export default function Stats() {
  const [chainId, setChainId] = useState<number | null>(null);

  // Get chain ID from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("chain");
    if (id) {
      setChainId(parseInt(id, 10));
    }
  }, []);

  // Fetch chain details
  const { data: chain, isLoading: chainLoading } = trpc.qr.get.useQuery(
    { chainId: chainId! },
    { enabled: chainId !== null }
  );

  // Fetch statistics
  const { data: stats, isLoading: statsLoading } = trpc.qr.getStats.useQuery(
    { chainId: chainId! },
    { enabled: chainId !== null }
  );

  // Fetch scan history
  const { data: scans, isLoading: scansLoading } = trpc.qr.getScans.useQuery(
    { chainId: chainId!, limit: 50 },
    { enabled: chainId !== null }
  );

  if (!chainId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-950 dark:to-blue-950 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>No Chain Selected</CardTitle>
            <CardDescription>Please provide a chain ID in the URL</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard">
              <Button className="w-full gap-2">
                <ArrowLeft className="w-4 h-4" /> Go to Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isLoading = chainLoading || statsLoading || scansLoading;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-950 dark:via-blue-950 dark:to-indigo-950">
      {/* Header */}
      <header className="border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <Link href="/dashboard">
            <Button variant="ghost" className="gap-2">
              <ArrowLeft className="w-4 h-4" /> Back to Dashboard
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Loading State */}
          {isLoading && (
            <div className="text-center py-12">
              <Loader2 className="w-12 h-12 animate-spin mx-auto text-blue-600" />
              <p className="text-slate-600 dark:text-slate-300 mt-4">Loading statistics...</p>
            </div>
          )}

          {!isLoading && chain && stats && (
            <>
              {/* Page Header */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <h1 className="text-3xl font-bold">{chain.name}</h1>
                  {chain.isActive ? (
                    <CheckCircle2 className="w-6 h-6 text-green-500" />
                  ) : (
                    <XCircle className="w-6 h-6 text-red-500" />
                  )}
                </div>
                {chain.description && (
                  <p className="text-slate-600 dark:text-slate-300">{chain.description}</p>
                )}
              </div>

              {/* Stats Overview */}
              <div className="grid md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription>Total Scans</CardDescription>
                    <CardTitle className="text-3xl">{stats.totalScans}</CardTitle>
                  </CardHeader>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription>Valid Scans</CardDescription>
                    <CardTitle className="text-3xl text-green-600 dark:text-green-400">
                      {stats.validScans}
                    </CardTitle>
                  </CardHeader>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription>Invalid Scans</CardDescription>
                    <CardTitle className="text-3xl text-red-600 dark:text-red-400">
                      {stats.invalidScans}
                    </CardTitle>
                  </CardHeader>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription>Remaining</CardDescription>
                    <CardTitle className="text-3xl">{stats.remaining}</CardTitle>
                  </CardHeader>
                </Card>
              </div>

              {/* Progress Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Chain Progress
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-3 gap-6 text-center">
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Chain Length</p>
                      <p className="text-2xl font-bold">{stats.chainLength}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Scanned</p>
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.scanned}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Completion</p>
                      <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.percentComplete}%</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="w-full h-4 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 transition-all duration-500"
                        style={{ width: `${stats.percentComplete}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span>0</span>
                      <span>{stats.chainLength}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Scan History */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Recent Scans
                  </CardTitle>
                  <CardDescription>
                    Showing the last {scans?.length || 0} scan events
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {scans && scans.length > 0 ? (
                    <div className="space-y-2">
                      {scans.map((scan) => (
                        <div
                          key={scan.id}
                          className={`flex items-center justify-between p-3 rounded-lg border ${
                            scan.isValid
                              ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
                              : "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {scan.isValid ? (
                              <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                            ) : (
                              <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                            )}
                            <div className="min-w-0">
                              <p className="text-sm font-medium">
                                {scan.isValid ? "Valid Scan" : "Invalid Scan"}
                                {" • "}
                                Index {scan.chainIndex}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono truncate">
                                {scan.hashValue.substring(0, 16)}...
                              </p>
                              {!scan.isValid && scan.errorMessage && (
                                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                                  {scan.errorMessage}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0 ml-4">
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {new Date(scan.scannedAt).toLocaleString()}
                            </p>
                            {scan.ipAddress && (
                              <p className="text-xs text-slate-400 dark:text-slate-500">
                                {scan.ipAddress}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                      <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No scans recorded yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <div className="flex gap-3">
                <Link href={`/display?chain=${chainId}`}>
                  <Button className="gap-2">
                    View Live Display
                  </Button>
                </Link>
                <Link href="/scan">
                  <Button variant="outline" className="gap-2">
                    Test Scanner
                  </Button>
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
