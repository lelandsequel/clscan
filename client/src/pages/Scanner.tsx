import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, Scan } from "lucide-react";
import { useState, useEffect } from "react";
import { Link } from "wouter";
import { toast } from "sonner";

export default function Scanner() {
  const [chainId, setChainId] = useState("");
  const [hashValue, setHashValue] = useState("");
  const [scanResult, setScanResult] = useState<{
    success: boolean;
    message: string;
    remaining?: number;
    chainExhausted?: boolean;
  } | null>(null);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);

  const scanMutation = trpc.qr.scan.useMutation({
    onSuccess: (data) => {
      setScanResult(data);
      toast.success(data.message);
      setShowSuccessAnimation(true);
      setTimeout(() => setShowSuccessAnimation(false), 1000);
      // Clear form
      setHashValue("");
    },
    onError: (error) => {
      setScanResult({
        success: false,
        message: error.message,
      });
      toast.error(error.message);
    },
  });

  const handleScan = () => {
    if (!chainId || !hashValue) {
      toast.error("Please enter both Chain ID and Hash Value");
      return;
    }

    setScanResult(null);
    scanMutation.mutate({
      chainId: parseInt(chainId, 10),
      hashValue: hashValue.trim(),
    });
  };

  const handlePasteJSON = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const data = JSON.parse(text);
      
      if (data.chainId && data.hash) {
        setChainId(data.chainId.toString());
        setHashValue(data.hash);
        toast.success("QR data pasted successfully");
      } else {
        toast.error("Invalid QR code format");
      }
    } catch (error) {
      toast.error("Failed to parse QR code data");
    }
  };

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
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Title */}
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold">QR Code Scanner</h1>
            <p className="text-slate-600 dark:text-slate-300">
              Validate and scan morphing QR codes
            </p>
          </div>

          {/* Scanner Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scan className="w-5 h-5" />
                Scan QR Code
              </CardTitle>
              <CardDescription>
                Enter the chain ID and hash value from the QR code, or paste the JSON payload
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="chainId">Chain ID</Label>
                <Input
                  id="chainId"
                  type="number"
                  placeholder="e.g., 1"
                  value={chainId}
                  onChange={(e) => setChainId(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="hashValue">Hash Value</Label>
                <Input
                  id="hashValue"
                  placeholder="e.g., a3f8d9c2..."
                  value={hashValue}
                  onChange={(e) => setHashValue(e.target.value)}
                  className="font-mono text-sm"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleScan}
                  disabled={scanMutation.isPending}
                  className="flex-1 gap-2"
                >
                  {scanMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Validating...
                    </>
                  ) : (
                    <>
                      <Scan className="w-4 h-4" />
                      Validate & Scan
                    </>
                  )}
                </Button>
                <Button
                  onClick={handlePasteJSON}
                  variant="outline"
                  type="button"
                >
                  Paste JSON
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Scan Result */}
          {scanResult && (
            <Card className={`transition-all duration-500 ${
              scanResult.success 
                ? "border-green-200 dark:border-green-800" + (showSuccessAnimation ? " scale-105 shadow-2xl shadow-green-500/20" : "")
                : "border-red-200 dark:border-red-800"
            }`}>
              <CardHeader>
                <CardTitle className={`flex items-center gap-2 ${scanResult.success ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                  {scanResult.success ? (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      Scan Successful
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-5 h-5" />
                      Scan Failed
                    </>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-slate-700 dark:text-slate-300">{scanResult.message}</p>
                
                {scanResult.success && scanResult.remaining !== undefined && (
                  <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600 dark:text-slate-400">Remaining codes:</span>
                      <span className="font-semibold">{scanResult.remaining}</span>
                    </div>
                    {scanResult.chainExhausted && (
                      <p className="text-sm text-orange-600 dark:text-orange-400 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        Chain exhausted - no more codes available
                      </p>
                    )}
                  </div>
                )}

                {scanResult.success && (
                  <div className="pt-2">
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                      ✅ The QR code has been validated and marked as used. The display will now show a new code.
                    </p>
                    <Link href={`/display?chain=${chainId}`}>
                      <Button variant="outline" className="w-full">
                        View Updated Display
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Instructions */}
          <Card>
            <CardHeader>
              <CardTitle>How to Scan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
              <div>
                <strong>Method 1: Manual Entry</strong>
                <p className="mt-1">Copy the chain ID and hash value from the QR code display and paste them into the form above.</p>
              </div>
              
              <div>
                <strong>Method 2: JSON Payload</strong>
                <p className="mt-1">If your QR scanner extracts the full JSON payload, click "Paste JSON" to auto-fill the form.</p>
              </div>

              <div>
                <strong>Method 3: Mobile Scanner</strong>
                <p className="mt-1">Use a QR scanner app on your phone. The QR code contains a validation URL that will automatically process the scan.</p>
              </div>

              <div className="pt-3 border-t">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  💡 <strong>Tip:</strong> Each code can only be scanned once. After a successful scan, the code immediately becomes invalid and a new one is displayed.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Quick Test */}
          <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
            <CardHeader>
              <CardTitle className="text-blue-700 dark:text-blue-300">Quick Test</CardTitle>
              <CardDescription className="text-blue-600 dark:text-blue-400">
                Want to see it in action? Create a test chain and try scanning
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/dashboard">
                <Button className="w-full">
                  Create Test Chain
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
