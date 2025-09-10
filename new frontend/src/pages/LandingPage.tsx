import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ChevronRight } from 'lucide-react';

export default function LandingPage() {
  console.log('🏠 LandingPage: Component is rendering');

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden min-h-screen flex items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background/80 to-background/90"></div>
        <div className="container mx-auto px-4 relative">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-7xl md:text-9xl font-bold mb-6">
              <span className="gradient-text">0x.Certs</span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              The future of hackathon certificates. Secure, verifiable, and powered by Web3 technology.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/participant">
                <Button size="lg" variant="default" className="min-w-[200px]">
                  Join as Participant
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/organizer">
                <Button size="lg" variant="outline" className="min-w-[200px]">
                  Organize Events
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 md:py-32 bg-muted/20">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-lg text-muted-foreground">
              Simple steps to get your verifiable Web3 certificates
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="mx-auto mb-6 p-4 rounded-full bg-primary/10 w-fit">
                  <span className="text-2xl font-bold text-primary">1</span>
                </div>
                <h3 className="text-xl font-semibold mb-3">Connect Wallet</h3>
                <p className="text-muted-foreground">
                  Connect your Web3 wallet using RainbowKit for secure authentication
                </p>
              </div>

              <div className="text-center">
                <div className="mx-auto mb-6 p-4 rounded-full bg-primary/10 w-fit">
                  <span className="text-2xl font-bold text-primary">2</span>
                </div>
                <h3 className="text-xl font-semibold mb-3">Join Event</h3>
                <p className="text-muted-foreground">
                  Register for hackathons using your unique 6-digit event code
                </p>
              </div>

              <div className="text-center">
                <div className="mx-auto mb-6 p-4 rounded-full bg-primary/10 w-fit">
                  <span className="text-2xl font-bold text-primary">3</span>
                </div>
                <h3 className="text-xl font-semibold mb-3">Earn NFTs</h3>
                <p className="text-muted-foreground">
                  Complete the event and receive your proof-of-attendance and certificate NFTs
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-32">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Ready to Get Started?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Join thousands of developers earning verifiable Web3 certificates
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/participant">
                <Button size="lg" variant="default" className="min-w-[200px]">
                  Start as Participant
                </Button>
              </Link>
              <Link to="/organizer">
                <Button size="lg" variant="outline" className="min-w-[200px]">
                  Become an Organizer
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}