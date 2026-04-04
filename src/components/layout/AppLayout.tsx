import { AnimatePresence, motion } from "framer-motion";
import { Outlet, ScrollRestoration, useLocation } from "react-router-dom";
import { Navbar } from "./Navbar";

export function AppLayout() {
  const location = useLocation();

  return (
    <div className="min-h-screen w-full overflow-x-hidden">
      <Navbar />
      <main className="container cricket-stage min-w-0 pb-12 pt-6">
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
      <ScrollRestoration />
    </div>
  );
}
