import React from 'react';
import '@rainbow-me/rainbowkit/styles.css';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { config } from './wagmi';
import HackerDashboard from './HackerDashboard';
import OrganizerDashboard from './OrganizerDashboard';

// Force clear all possible caches
if (typeof window !== 'undefined') {
  // Clear localStorage
  localStorage.clear();
  // Clear sessionStorage  
  sessionStorage.clear();
  // Clear any wagmi-related cache keys
  Object.keys(localStorage).forEach(key => {
    if (key.includes('wagmi') || key.includes('rainbow') || key.includes('viem')) {
      localStorage.removeItem(key);
    }
  });
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,
      gcTime: 0,
      refetchOnWindowFocus: false,
    },
  },
});

const App: React.FC = () => {
  // Get route from URL hash or default to hacker
  const getRoute = () => {
    const hash = window.location.hash.replace('#', '');
    return hash || 'hacker';
  };

  const [currentRoute, setCurrentRoute] = React.useState(getRoute());

  React.useEffect(() => {
    const handleHashChange = () => {
      setCurrentRoute(getRoute());
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const renderCurrentPage = () => {
    switch (currentRoute) {
      case 'organizer':
        return <OrganizerDashboard />;
      case 'hacker':
        return <HackerDashboard />;
      default:
        return (
          <div style={{
            fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}>
            <div style={{
              background: 'white',
              borderRadius: '15px',
              padding: '40px',
              textAlign: 'center',
              maxWidth: '600px',
              boxShadow: '0 15px 35px rgba(0, 0, 0, 0.1)'
            }}>
              <h1 style={{ color: '#667eea', marginBottom: '20px' }}>🎖️ Hackathon Certificate DApp</h1>
              <p style={{ marginBottom: '30px', color: '#6c757d' }}>
                A decentralized application for hackathon/workshop event participation and certificate NFT minting.
              </p>
              <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <a 
                  href="#hacker" 
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    padding: '15px 30px',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    fontWeight: 'bold'
                  }}
                >
                  🚀 Hacker Dashboard
                </a>
                <a 
                  href="#organizer" 
                  style={{
                    background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                    color: 'white',
                    padding: '15px 30px',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    fontWeight: 'bold'
                  }}
                >
                  🛠️ Organizer Dashboard
                </a>
                <a 
                  href="admin.html" 
                  style={{
                    background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)',
                    color: 'white',
                    padding: '15px 30px',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    fontWeight: 'bold'
                  }}
                >
                  👑 Admin Dashboard
                </a>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          {renderCurrentPage()}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};

export default App;