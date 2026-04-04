import { Home } from "lucide-react";
import { Link } from "react-router-dom";
import { usePageMetadata } from "@/hooks/use-page-metadata";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function NotFoundPage() {
  usePageMetadata({
    title: "Page Not Found",
    description: "The requested Criclytics page could not be found.",
    robots: "noindex, nofollow",
    path: "/404"
  });

  return (
    <Card className="mx-auto max-w-2xl rounded-3xl">
      <CardHeader>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">404</p>
        <CardTitle className="mt-3 text-3xl">This route doesn’t exist in Criclytics.</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-sm leading-7 text-muted-foreground">
          The page you tried to open is missing or has moved. Use the home route to get back to live, upcoming, and completed matches.
        </p>
        <Button asChild>
          <Link to="/">
            <Home className="h-4 w-4" />
            Back to dashboard
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
