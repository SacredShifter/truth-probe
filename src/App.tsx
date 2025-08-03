import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import { TruthFeed } from "./pages/TruthFeed";
import NotFound from "./pages/NotFound";
import { Watchlist } from "./modules/valeion/Watchlist";
import { CodexViewer } from "./modules/valeion/CodexViewer";
import { TruthBeacons } from "./modules/valeion/TruthBeacons";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/truth-feed" element={<TruthFeed />} />
          <Route path="/watchlist" element={<Watchlist />} />
          <Route path="/codex" element={<CodexViewer />} />
          <Route path="/beacons" element={<TruthBeacons />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
