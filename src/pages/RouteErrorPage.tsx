import { isRouteErrorResponse, Link, useRouteError } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function RouteErrorPage() {
  const error = useRouteError();

  const title = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText || "Route error"}`
    : "This page could not be loaded";
  const message = isRouteErrorResponse(error)
    ? error.data?.message || "The requested route failed while building its UI."
    : error instanceof Error
      ? error.message
      : "An unexpected routing error occurred.";

  return (
    <main className="container py-12">
      <Card className="mx-auto max-w-2xl rounded-3xl">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-sm leading-7 text-muted-foreground">{message}</p>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link to="/">Back to dashboard</Link>
            </Button>
            <Button onClick={() => window.location.reload()} type="button" variant="outline">
              Reload route
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
