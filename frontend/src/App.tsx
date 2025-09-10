import React from 'react';
import '@rainbow-me/rainbowkit/styles.css';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { config } from './wagmi';
import HackerDashboard from './HackerDashboard';
import OrganizerDashboard from './OrganizerDashboard';

// Error Boundary Component
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error?: Error }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🚫 Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
          background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)',
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
            <h1 style={{ color: '#ff6b6b', marginBottom: '20px' }}>🚫 Something went wrong</h1>
            <p style={{ marginBottom: '20px', color: '#6c757d' }}>
              The application encountered an error. Please check the console for details.
            </p>
            <pre style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px', textAlign: 'left', overflow: 'auto' }}>
              {this.state.error?.message}
            </pre>
            <button 
              onClick={() => window.location.reload()}
              style={{
                background: '#ff6b6b',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                cursor: 'pointer',
                marginTop: '20px'
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
  console.log('🚀 App: Component is rendering');
  console.log('🌍 Current URL:', window.location.href);
  
  // Get route from URL hash or default to hacker
  const getRoute = () => {
    const hash = window.location.hash.replace('#', '');
    console.log('📋 Current hash route:', hash || 'default');
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
    console.log('🗺 Rendering route:', currentRoute);
    try {
      switch (currentRoute) {
        case 'organizer':
          console.log('🚀 Loading OrganizerDashboard...');
          return <OrganizerDashboard />;
        case 'hacker':
          console.log('🚀 Loading HackerDashboard...');
          return <HackerDashboard />;
        default:
          console.log('🏠 Loading home page...');
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
                <h1 style={{ color: '#667eea', marginBottom: '20px' }}>🏅️ Hackathon Certificate DApp</h1>
                <p style={{ marginBottom: '20px', color: '#6c757d' }}>
                  A decentralized application for hackathon/workshop event participation and certificate NFT minting.
                </p>
                <div style={{ background: '#fff3cd', padding: '15px', borderRadius: '8px', marginBottom: '20px', color: '#856404' }}>
                  📍 <strong>Access Instructions:</strong><br/>
                  • Frontend runs on: <a href="http://localhost:3000" target="_blank">http://localhost:3000</a><br/>
                  • Use hash routing: <a href="http://localhost:3000#organizer" target="_blank">http://localhost:3000#organizer</a>
                </div>
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
    } catch (error) {
      console.error('❌ Error in renderCurrentPage:', error);
      return (
        <div style={{
          fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
          background: '#ff6b6b',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          padding: '20px'
        }}>
          <div>
            <h1>❌ Error loading page</h1>
            <p>Check console for details. Error: {error instanceof Error ? error.message : 'Unknown error'}</p>
          </div>
        </div>
      );
    }
  };

  return (
    <ErrorBoundary>
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitProvider>
            {renderCurrentPage()}
          </RainbowKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </ErrorBoundary>
  );
};

export default App;