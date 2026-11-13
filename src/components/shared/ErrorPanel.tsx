import { AlertTriangle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ErrorPanel({
  title,
  message,
  onRetry,
  compact = false
}: {
  title: string;
  message: string;
  onRetry?: () => void;
  compact?: boolean;
}) {
  return (
    <Card className={compact ? "rounded-md" : "rounded-lg"}>
      <CardHeader className={compact ? "p-5" : undefined}>
        <div className="flex h-12 w-12 items-center justify-center rounded-md bg-destructive/10 text-destructive">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <CardTitle className="mt-4">{title}</CardTitle>
      </CardHeader>
      <CardContent className={compact ? "p-5 pt-0" : undefined}>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">{message}</p>
        {onRetry ? (
          <Button className="mt-4" onClick={onRetry} type="button" variant="outline">
            <RotateCw className="h-4 w-4" />
            Retry
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
