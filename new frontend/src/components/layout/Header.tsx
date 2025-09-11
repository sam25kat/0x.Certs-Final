import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Hexagon, Shield, Users } from 'lucide-react';

export const Header = () => {
  const location = useLocation();
  const isAdmin = location.pathname.includes('admin-portal');
  const isOrganizer = location.pathname.includes('organizer');
  
  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <span className="text-2xl font-bold fira-code-bold">
            <span className="text-white">0x</span><span className="gradient-text">.Certs</span>
          </span>
          <Badge variant="secondary" className="ml-1 text-xs">BETA</Badge>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          {/* Navigation items removed for cleaner design */}
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