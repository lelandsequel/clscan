import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { APP_LOGO, APP_TITLE, getLoginUrl } from "@/const";
import { ArrowRight, Lock, RefreshCw, Scan, Shield, Zap } from "lucide-react";
import { Link } from "wouter";

export default function Home() {
  const { user, isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-950 dark:via-blue-950 dark:to-indigo-950">
      {/* Header */}
      <header className="border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {APP_LOGO && <img src={APP_LOGO} alt={APP_TITLE} className="h-8 w-8" />}
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              {APP_TITLE}
            </h1>
          </div>
          <nav className="flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <Link href="/dashboard">
                  <Button variant="ghost">Dashboard</Button>
                </Link>
                <Link href="/display">
                  <Button variant="outline">Live Display</Button>
                </Link>
              </>
            ) : (
              <Button asChild>
                <a href={getLoginUrl()}>Get Started</a>
              </Button>
            )}
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium mb-4">
            <Zap className="w-4 h-4" />
            Next-Generation QR Technology
          </div>
          
          <h2 className="text-5xl md:text-6xl font-bold tracking-tight">
            QR Codes That{" "}
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Morph
            </span>
          </h2>
          
          <p className="text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
            A revolutionary scannable code that changes after each use. Every user gets a unique code, 
            creating an unbreakable chain of sequential, verifiable interactions.
          </p>

          <div className="flex gap-4 justify-center pt-6">
            {isAuthenticated ? (
              <>
                <Link href="/dashboard">
                  <Button size="lg" className="gap-2">
                    Go to Dashboard <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                <Link href="/display">
                  <Button size="lg" variant="outline" className="gap-2">
                    <Scan className="w-4 h-4" /> View Live Demo
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Button size="lg" asChild className="gap-2">
                  <a href={getLoginUrl()}>
                    Get Started <ArrowRight className="w-4 h-4" />
                  </a>
                </Button>
                <Link href="/display">
                  <Button size="lg" variant="outline" className="gap-2">
                    <Scan className="w-4 h-4" /> View Demo
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-5xl mx-auto">
          <h3 className="text-3xl font-bold text-center mb-12">How It Works</h3>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-2">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4">
                  <RefreshCw className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <CardTitle>1. Display Code₀</CardTitle>
                <CardDescription>
                  The system displays the first unique QR code in a cryptographic hash chain
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mb-4">
                  <Scan className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <CardTitle>2. User Scans</CardTitle>
                <CardDescription>
                  User A scans Code₀. The system validates and records the scan event
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-4">
                  <Zap className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <CardTitle>3. Code Morphs</CardTitle>
                <CardDescription>
                  Instantly, the display updates to Code₁. User B sees a completely different code
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-5xl mx-auto">
          <h3 className="text-3xl font-bold text-center mb-12">Why Morphing QR Codes?</h3>
          
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <Shield className="w-8 h-8 text-blue-600 dark:text-blue-400 mb-2" />
                <CardTitle>Prevents Screenshot Sharing</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600 dark:text-slate-300">
                  Once scanned, the code becomes invalid. Screenshots can't be reused, eliminating ticket fraud and unauthorized access.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Lock className="w-8 h-8 text-indigo-600 dark:text-indigo-400 mb-2" />
                <CardTitle>Cryptographically Secure</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600 dark:text-slate-300">
                  Built on SHA-256 hash chains. Each code is mathematically unique and verifiable, impossible to forge or predict.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <RefreshCw className="w-8 h-8 text-purple-600 dark:text-purple-400 mb-2" />
                <CardTitle>Real-Time Updates</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600 dark:text-slate-300">
                  Codes morph instantly after validation. No lag, no confusion—just seamless sequential access control.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Scan className="w-8 h-8 text-pink-600 dark:text-pink-400 mb-2" />
                <CardTitle>Complete Audit Trail</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600 dark:text-slate-300">
                  Every scan is tracked with timestamp, user info, and validation status. Perfect for compliance and analytics.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="container mx-auto px-4 py-16 bg-white/50 dark:bg-slate-900/50">
        <div className="max-w-5xl mx-auto">
          <h3 className="text-3xl font-bold text-center mb-12">Use Cases</h3>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: "Event Ticketing", desc: "Prevent ticket fraud and scalping" },
              { title: "Access Control", desc: "One-time-use credentials" },
              { title: "Supply Chain", desc: "Track products through handlers" },
              { title: "Anti-Counterfeiting", desc: "Verify product authenticity" },
            ].map((useCase) => (
              <Card key={useCase.title} className="text-center">
                <CardHeader>
                  <CardTitle className="text-lg">{useCase.title}</CardTitle>
                  <CardDescription>{useCase.desc}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-2xl mx-auto space-y-6">
          <h3 className="text-4xl font-bold">Ready to Try It?</h3>
          <p className="text-xl text-slate-600 dark:text-slate-300">
            Create your first morphing QR code in seconds. No credit card required.
          </p>
          <Button size="lg" asChild className="gap-2">
            <a href={getLoginUrl()}>
              Get Started Free <ArrowRight className="w-4 h-4" />
            </a>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-8 text-center text-sm text-slate-600 dark:text-slate-400">
          <p>© 2025 {APP_TITLE}. Built with cryptographic hash chains and modern web technology.</p>
        </div>
      </footer>
    </div>
  );
}
