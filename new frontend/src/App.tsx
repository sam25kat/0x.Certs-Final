import '@rainbow-me/rainbowkit/styles.css';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { config } from './config/wagmi';
import { Header } from './components/layout/Header';
import LandingPage from "./pages/LandingPage";
import ParticipantDashboard from "./pages/ParticipantDashboard";
import OrganizerDashboard from "./pages/OrganizerDashboard";
import AdminPortal from "./pages/AdminPortal";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <WagmiProvider config={config}>
    <QueryClientProvider client={queryClient}>
      <RainbowKitProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <div className="min-h-screen bg-background">
              <Header />
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/participant" element={<ParticipantDashboard />} />
                <Route path="/organizer" element={<OrganizerDashboard />} />
                <Route path="/admin-portal/:secretKey" element={<AdminPortal />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </div>
          </BrowserRouter>
        </TooltipProvider>
      </RainbowKitProvider>
    </QueryClientProvider>
  </WagmiProvider>
);

export default App;
