import Link from "next/link";
import { AudioLines } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center">
        <div className="flex justify-center mb-6">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <AudioLines className="h-8 w-8 text-primary" />
          </div>
        </div>
        <h1 className="text-6xl font-bold">404</h1>
        <p className="text-muted-foreground mt-3">
          Page not found.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-6 transition-colors mt-6"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
