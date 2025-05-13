import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="container flex items-center justify-between py-4">
        <div className="flex items-center gap-2">
          <span className="font-bold text-xl">VideoCollab</span>
        </div>
        <nav className="flex items-center gap-4">
          <Link href="/pricing">Pricing</Link>
          <Link href="/about">About</Link>
          <Link href="/sign-in">
            <Button variant="outline">Sign In</Button>
          </Link>
          <Link href="/sign-up">
            <Button>Get Started</Button>
          </Link>
        </nav>
      </header>
      <main className="flex-1 container">
        <section className="py-20 text-center">
          <h1 className="text-5xl font-bold mb-6">Record, Share, Collaborate</h1>
          <p className="text-xl mb-8 max-w-2xl mx-auto">
            The all-in-one video collaboration platform for teams. Record your screen, 
            share with your team, and collaborate in real-time.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/sign-up">
              <Button size="lg">Start for Free</Button>
            </Link>
            <Link href="/pricing">
              <Button size="lg" variant="outline">View Pricing</Button>
            </Link>
          </div>
        </section>
      </main>
      <footer className="border-t py-6">
        <div className="container flex justify-between">
          <p>© 2025 VideoCollab. All rights reserved.</p>
          <nav className="flex gap-4">
            <Link href="/terms">Terms</Link>
            <Link href="/privacy">Privacy</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}