import React from 'react';
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
import { NetworkSwitcher } from './components/NetworkSwitcher';
import LandingPage from "./pages/LandingPage";
import ParticipantDashboard from "./pages/ParticipantDashboard";
import OrganizerDashboard from "./pages/OrganizerDashboard";
import AdminPortal from "./pages/AdminPortal";
import NotFound from "./pages/NotFound";

// Error Boundary Component
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error?: Error; errorInfo?: React.ErrorInfo }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🚫 Error caught by boundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          backgroundColor: '#1a1a1a',
          color: 'white',
          fontFamily: 'system-ui, sans-serif'
        }}>
          <div style={{
            background: '#2a2a2a',
            borderRadius: '8px',
            padding: '2rem',
            maxWidth: '600px',
            border: '1px solid #ef4444'
          }}>
            <h1 style={{ color: '#ef4444', marginBottom: '1rem', fontSize: '1.5rem' }}>🚫 Application Error</h1>
            <p style={{ marginBottom: '1rem' }}>Something went wrong. Please check the console for details.</p>
            <pre style={{ 
              background: '#1a1a1a', 
              padding: '1rem', 
              borderRadius: '4px', 
              overflow: 'auto',
              fontSize: '0.875rem',
              marginBottom: '1rem'
            }}>
              {this.state.error?.message}
              {this.state.errorInfo?.componentStack}
            </pre>
            <button 
              onClick={() => window.location.reload()}
              style={{
                background: '#ef4444',
                color: 'white',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const queryClient = new QueryClient();

const App = () => {
  console.log('🚀 App: Starting application...');
  
  try {
    return (
      <ErrorBoundary>
        <WagmiProvider config={config}>
          <QueryClientProvider client={queryClient}>
            <RainbowKitProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                <BrowserRouter>
                  <div className="min-h-screen bg-background">
                    <NetworkSwitcher />
                    <Header />
                    <Routes>
                      <Route path="/" element={<LandingPage />} />
                      <Route path="/participant" element={<ParticipantDashboard />} />
                      {/* Hidden organizer route - no UI links, access via direct URL */}
                      <Route path="/organizer-access-portal" element={<OrganizerDashboard />} />
                      <Route path="/admin-portal/:secretKey" element={<AdminPortal />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </div>
                </BrowserRouter>
              </TooltipProvider>
            </RainbowKitProvider>
          </QueryClientProvider>
        </WagmiProvider>
      </ErrorBoundary>
    );
  } catch (error) {
    console.error('❌ Error in App component:', error);
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ef4444',
        color: 'white',
        padding: '2rem'
      }}>
        <div>
          <h1>❌ Critical Error</h1>
          <p>Application failed to start. Check console for details.</p>
          <p>{error instanceof Error ? error.message : String(error)}</p>
        </div>
      </div>
    );
  }
};

export default App;
