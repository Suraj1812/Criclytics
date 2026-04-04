import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { AppErrorBoundary } from "./components/shared/AppErrorBoundary";
import { ApiClientError } from "./services/api-client";
import { AppRouter } from "./routes/AppRouter";
import { ThemeProvider } from "./hooks/use-theme";

export default function App() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry(failureCount, error) {
              if (error instanceof ApiClientError && !error.retryable) {
                return false;
              }

              return failureCount < 2;
            },
            retryDelay(attemptIndex) {
              return Math.min(1_000 * 2 ** attemptIndex, 4_000);
            },
            staleTime: 10_000,
            gcTime: 5 * 60 * 1_000,
            refetchOnWindowFocus: false
          }
        }
      })
  );

  return (
    <ThemeProvider>
      <AppErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <AppRouter />
        </QueryClientProvider>
      </AppErrorBoundary>
    </ThemeProvider>
  );
}
