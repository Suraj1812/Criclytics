import { AnimatePresence, motion } from "framer-motion";
import { Outlet, ScrollRestoration, useLocation } from "react-router-dom";
import { Navbar } from "./Navbar";

export function AppLayout() {
  const location = useLocation();

  return (
    <div className="min-h-screen w-full overflow-x-hidden">
      <Navbar />
      <main className="container min-w-0 pb-16 pt-7 sm:pt-10">
        <AnimatePresence mode="wait">
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            initial={{ opacity: 0, y: 12 }}
            key={location.pathname}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
      <footer className="container flex flex-wrap items-center justify-between gap-3 border-t border-border py-6 text-xs text-muted-foreground">
        <p>For the love of the game.</p>
        <p>Scores · Stories · Every session.</p>
      </footer>
      <ScrollRestoration />
    </div>
  );
}
