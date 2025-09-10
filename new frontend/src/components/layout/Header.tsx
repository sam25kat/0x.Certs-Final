import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Hexagon, Shield, Users } from 'lucide-react';

export const Header = () => {
  const location = useLocation();
  const isAdmin = location.pathname.includes('admin-portal');
  const isOrganizer = location.pathname.includes('organizer');
  
  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <Hexagon className="h-8 w-8 text-primary" />
          <span className="text-2xl font-bold gradient-text">0x.Certs</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          {!isAdmin && (
            <>
              <Link to="/participant">
                <Button variant="ghost" size="sm" className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Participant
                </Button>
              </Link>
              <Link to="/organizer">
                <Button variant="ghost" size="sm" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Organizer
                </Button>
              </Link>
            </>
          )}
        </nav>

        <div className="flex items-center gap-4">
          <ConnectButton
            showBalance={false}
            chainStatus="icon"
            accountStatus={{
              smallScreen: 'avatar',
              largeScreen: 'full',
            }}
          />
        </div>
      </div>
    </header>
  );
};