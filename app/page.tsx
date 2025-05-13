// src/app/page.tsx
import Link from "next/link";
import { ArrowRight, Video, Users, MessageSquare, Shield, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { auth } from "@clerk/nextjs/server";
import { ModeToggle } from "@/components/theme-toggle";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SignOutButton } from "@clerk/nextjs";

export default async function HomePage() {
  const { userId } = await auth();
  
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <header className="container mx-auto px-4 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Video className="h-6 w-6 text-primary" />
          <span className="font-bold text-xl">VideoCollab</span>
        </div>
        
        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6">
          <Link href="/pricing" className="text-muted-foreground hover:text-foreground transition-colors">
            Pricing
          </Link>
          <Link href="/about" className="text-muted-foreground hover:text-foreground transition-colors">
            About
          </Link>
          <Link href="/features" className="text-muted-foreground hover:text-foreground transition-colors">
            Features
          </Link>
        </nav>
        
        {/* Desktop Auth & Theme */}
        <div className="hidden md:flex items-center gap-4">
          <ModeToggle />
          {userId ? (<>
            <Link href="/dashboard">
              <Button>Go to Dashboard</Button>
            </Link>
            <SignOutButton />
          </>
          ) : (
            <>
              <Link href="/sign-in">
                <Button variant="ghost">Sign In</Button>
              </Link>
              <Link href="/sign-up">
                <Button>Get Started</Button>
              </Link>
            </>
          )}
        </div>
        
        {/* Mobile Menu */}
        <div className="flex items-center gap-4 md:hidden">
          <ModeToggle />
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent>
              <div className="flex flex-col gap-4 mt-8">
                <Link href="/pricing" className="text-lg font-medium">
                  Pricing
                </Link>
                <Link href="/about" className="text-lg font-medium">
                  About
                </Link>
                <Link href="/features" className="text-lg font-medium">
                  Features
                </Link>
                <div className="h-px bg-border my-4" />
                {userId ? (
                  <Link href="/dashboard">
                    <Button className="w-full">Go to Dashboard</Button>
                  </Link>
                ) : (
                  <>
                    <Link href="/sign-in">
                      <Button variant="outline" className="w-full">Sign In</Button>
                    </Link>
                    <Link href="/sign-up">
                      <Button className="w-full">Get Started</Button>
                    </Link>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-20 md:py-28 bg-gradient-to-b from-muted/50 to-background">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
              Record, Share, and Collaborate on Videos
            </h1>
            <p className="text-xl text-muted-foreground mb-10 max-w-3xl mx-auto">
              The all-in-one platform for teams to create, share, and collaborate on 
              videos with powerful AI features.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/sign-up">
                <Button size="lg" className="w-full sm:w-auto">
                  Start for Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/features">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  See Features
                </Button>
              </Link>
            </div>
            
            {/* Mock UI Preview */}
            <div className="mt-16 relative max-w-5xl mx-auto">
              <div className="bg-card border rounded-xl shadow-2xl overflow-hidden">
                <div className="p-2 bg-muted flex items-center gap-2 border-b">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 bg-destructive/70 rounded-full"></div>
                    <div className="w-3 h-3 bg-yellow-500/70 rounded-full"></div>
                    <div className="w-3 h-3 bg-green-500/70 rounded-full"></div>
                  </div>
                  <div className="w-full flex justify-center">
                    <div className="bg-background/80 rounded-full px-4 py-1 text-xs">
                      videocollab.app
                    </div>
                  </div>
                </div>
                <div className="aspect-video bg-black/90 flex items-center justify-center">
                  <div className="text-white/90 flex flex-col items-center">
                    <Video className="h-12 w-12 mb-2" />
                    <p>Video Player Preview</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">Powerful Collaboration Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="bg-background border rounded-lg p-6 shadow-sm">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Video className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Record Anything</h3>
                <p className="text-muted-foreground">
                  Capture your screen, camera, or both with our easy-to-use recording tools.
                  Record with high-quality audio and video.
                </p>
              </div>
              
              {/* Feature 2 */}
              <div className="bg-background border rounded-lg p-6 shadow-sm">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Team Workspaces</h3>
                <p className="text-muted-foreground">
                  Organize videos into workspaces for different teams or projects.
                  Invite members with custom permission levels.
                </p>
              </div>
              
              {/* Feature 3 */}
              <div className="bg-background border rounded-lg p-6 shadow-sm">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <MessageSquare className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Threaded Comments</h3>
                <p className="text-muted-foreground">
                  Leave time-stamped comments directly on videos.
                  Discuss ideas with nested replies and mentions.
                </p>
              </div>
              
              {/* Feature 4 */}
              <div className="bg-background border rounded-lg p-6 shadow-sm">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-primary"><path d="M12 2c1.6 0 3.1.8 4 2.1l4.2 5.2c1.9 2.4 1.9 5.9 0 8.3L16 22.7c-.9 1.3-2.4 2.1-4 2.1s-3.1-.8-4-2.1l-4.2-5.2C2 15.1 2 11.6 3.9 9.2L8 3.8C8.9 2.5 10.4 1.8 12 2Z"></path></svg>
                </div>
                <h3 className="text-xl font-semibold mb-2">AI Transcription</h3>
                <p className="text-muted-foreground">
                  Automatically generate accurate transcripts for all your videos.
                  Search through video content by text.
                </p>
              </div>
              
              {/* Feature 5 */}
              <div className="bg-background border rounded-lg p-6 shadow-sm">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-primary"><circle cx="12" cy="12" r="10"></circle><line x1="2" x2="22" y1="12" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
                </div>
                <h3 className="text-xl font-semibold mb-2">Real-time Updates</h3>
                <p className="text-muted-foreground">
                  See comments and reactions in real-time.
                  Collaborate with your team as if you're in the same room.
                </p>
              </div>
              
              {/* Feature 6 */}
              <div className="bg-background border rounded-lg p-6 shadow-sm">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Secure Sharing</h3>
                <p className="text-muted-foreground">
                  Control who can view your videos with fine-grained permissions.
                  Share securely with team members or external stakeholders.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials/CTA Section */}
        <section className="py-20">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-12">Start Collaborating Today</h2>
            <div className="max-w-2xl mx-auto">
              <p className="text-xl mb-8">
                Join thousands of teams who use VideoCollab to improve their video 
                collaboration workflow and boost productivity.
              </p>
              <Link href="/sign-up">
                <Button size="lg" className="mb-8">
                  Start Your Free Trial
                </Button>
              </Link>
              <p className="text-sm text-muted-foreground">
                No credit card required. Free tier available with basic features.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-12 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Video className="h-5 w-5 text-primary" />
                <span className="font-bold">VideoCollab</span>
              </div>
              <p className="text-sm text-muted-foreground">
                The modern video collaboration platform for teams.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-3">Product</h3>
              <ul className="space-y-2">
                <li><Link href="/features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</Link></li>
                <li><Link href="/pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</Link></li>
                <li><Link href="/roadmap" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Roadmap</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-3">Company</h3>
              <ul className="space-y-2">
                <li><Link href="/about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">About Us</Link></li>
                <li><Link href="/blog" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Blog</Link></li>
                <li><Link href="/careers" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Careers</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-3">Legal</h3>
              <ul className="space-y-2">
                <li><Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Terms</Link></li>
                <li><Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Privacy</Link></li>
                <li><Link href="/cookies" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Cookies</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="mt-12 pt-8 border-t text-center text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} VideoCollab. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}