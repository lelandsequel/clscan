import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";

export default function Display() {
  const [, setLocation] = useLocation();
  const [chainId, setChainId] = useState<number | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Get chain ID from URL query params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("chain");
    if (id) {
      setChainId(parseInt(id, 10));
    }
  }, []);

  // Query current QR code
  const { data, isLoading, error, refetch } = trpc.qr.getCurrent.useQuery(
    { chainId: chainId! },
    { 
      enabled: chainId !== null,
      refetchInterval: autoRefresh ? 2000 : false, // Auto-refresh every 2 seconds
    }
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-950 dark:to-blue-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-blue-600" />
          <p className="text-lg text-slate-600 dark:text-slate-300">Loading QR code...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-950 dark:to-blue-950 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-red-200 dark:border-red-800">
          <CardHeader>
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertCircle className="w-5 h-5" />
              <CardTitle>Error</CardTitle>
            </div>
            <CardDescription className="text-red-600 dark:text-red-400">
              {error.message}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button onClick={() => refetch()} variant="outline" className="w-full">
              Try Again
            </Button>
            <Link href="/dashboard">
              <Button variant="ghost" className="w-full gap-2">
                <ArrowLeft className="w-4 h-4" /> Back to Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-950 dark:via-blue-950 dark:to-indigo-950">
      {/* Header */}
      <header className="border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/dashboard">
            <Button variant="ghost" className="gap-2">
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <Button
              variant={autoRefresh ? "default" : "outline"}
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${autoRefresh ? "animate-spin" : ""}`} />
              {autoRefresh ? "Auto-Refresh On" : "Auto-Refresh Off"}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Display */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Chain Info */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold">{data?.chainName}</h1>
            <div className="flex items-center justify-center gap-4 text-sm text-slate-600 dark:text-slate-300">
              <span className="flex items-center gap-1">
                {data?.isActive ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    Active
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    Inactive
                  </>
                )}
              </span>
              <span>•</span>
              <span>{data?.remaining} / {data?.totalLength} remaining</span>
            </div>
          </div>

          {/* QR Code Display */}
          <Card className="border-2">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Current QR Code</CardTitle>
              <CardDescription>
                Scan this code with your mobile device. It will change after each successful scan.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center space-y-6">
              {/* QR Code */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl blur-xl opacity-20 animate-pulse" />
                <div className="relative bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-2xl">
                  <img
                    src={data?.qrCode}
                    alt="Morphing QR Code"
                    className="w-80 h-80 md:w-96 md:h-96"
                  />
                  {/* Live indicator */}
                  <div className="absolute top-2 right-2 flex items-center gap-2 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                    <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    LIVE
                  </div>
                </div>
              </div>

              {/* Hash Value (for debugging) */}
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-lg p-4">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Current Hash (Index {data?.currentIndex}):</p>
                <code className="text-xs font-mono break-all text-slate-700 dark:text-slate-300">
                  {data?.hashValue}
                </code>
              </div>

              {/* Progress Bar */}
              <div className="w-full space-y-2">
                <div className="flex justify-between text-sm text-slate-600 dark:text-slate-300">
                  <span>Progress</span>
                  <span>{data?.totalLength && data?.remaining ? ((data.totalLength - data.remaining) / data.totalLength * 100).toFixed(0) : 0}%</span>
                </div>
                <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                    style={{
                      width: `${data?.totalLength && data?.remaining ? ((data.totalLength - data.remaining) / data.totalLength * 100) : 0}%`,
                    }}
                  />
                </div>
              </div>

              {/* Scanner Link */}
              <Link href={`/scan?chain=${chainId}`}>
                <Button size="lg" className="gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Test Scanner
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Instructions */}
          <Card>
            <CardHeader>
              <CardTitle>How to Use</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
              <p>1. <strong>Scan the QR code</strong> with your mobile device's camera or QR scanner app</p>
              <p>2. <strong>Follow the validation link</strong> to verify the code</p>
              <p>3. <strong>Watch the code morph</strong> - it will instantly change to a new unique code</p>
              <p>4. <strong>Try scanning again</strong> - the old code will be rejected as already used</p>
              <p className="pt-3 text-xs text-slate-500 dark:text-slate-400">
                💡 Tip: Open this page on a computer and scan with your phone for the best experience
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
