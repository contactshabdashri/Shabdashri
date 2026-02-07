import { Link, useLocation } from "react-router-dom";
import { Home } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="container py-16 md:py-24 text-center">
      <h1 className="font-heading text-6xl md:text-8xl font-bold text-primary">
        404
      </h1>
      <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground mt-4">
        Page Not Found
      </h2>
      <p className="text-muted-foreground mt-4 max-w-md mx-auto">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link to="/" className="inline-block mt-8">
        <Button size="lg" className="gap-2">
          <Home className="h-5 w-5" />
          Go to Home
        </Button>
      </Link>
    </div>
  );
}