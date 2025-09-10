import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card-web3';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { api, type Participant } from '@/lib/api';
import { CheckCircle, Clock, Shield, Award, ExternalLink } from 'lucide-react';

export default function ParticipantDashboard() {
  const { address, isConnected } = useAccount();
  const { toast } = useToast();
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    team: '',
    telegram: '',
    event_code: '',
  });

  const handleRegister = async () => {
    if (!isConnected || !address) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to register",
        variant: "destructive",
      });
      return;
    }

    setIsRegistering(true);
    try {
      const newParticipant = await api.registerParticipant({
        ...formData,
        wallet_address: address,
        event_id: formData.event_code, // Using event_code as event_id for simplicity
      });
      setParticipant(newParticipant);
      toast({
        title: "Registration successful!",
        description: "You've been registered for the event",
      });
    } catch (error) {
      toast({
        title: "Registration failed",
        description: "Please check your event code and try again",
        variant: "destructive",
      });
    } finally {
      setIsRegistering(false);
    }
  };

  const StatusBadge = ({ status, label }: { status: boolean; label: string }) => (
    <div className="flex items-center gap-2">
      {status ? (
        <CheckCircle className="h-4 w-4 text-primary" />
      ) : (
        <Clock className="h-4 w-4 text-muted-foreground" />
      )}
      <span className={status ? 'text-primary' : 'text-muted-foreground'}>{label}</span>
      <Badge variant={status ? 'default' : 'secondary'} className="ml-auto">
        {status ? 'Complete' : 'Pending'}
      </Badge>
    </div>
  );

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader className="text-center">
              <Shield className="h-16 w-16 text-primary mx-auto mb-4" />
              <CardTitle className="gradient-text">Connect Your Wallet</CardTitle>
              <CardDescription>
                Connect your Web3 wallet to access the participant dashboard
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-muted-foreground">
                Use the connect button in the header to get started
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!participant) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="gradient-text">Event Registration</CardTitle>
              <CardDescription>
                Enter your details and event code to register
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter your full name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="your@email.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="team">Team (Optional)</Label>
                <Input
                  id="team"
                  value={formData.team}
                  onChange={(e) => setFormData(prev => ({ ...prev, team: e.target.value }))}
                  placeholder="Team name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="telegram">Telegram Username (Optional)</Label>
                <Input
                  id="telegram"
                  value={formData.telegram}
                  onChange={(e) => setFormData(prev => ({ ...prev, telegram: e.target.value }))}
                  placeholder="@username"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="event_code">6-Digit Event Code</Label>
                <Input
                  id="event_code"
                  value={formData.event_code}
                  onChange={(e) => setFormData(prev => ({ ...prev, event_code: e.target.value }))}
                  placeholder="123456"
                  maxLength={6}
                />
              </div>

              <Button
                onClick={handleRegister}
                disabled={isRegistering || !formData.name || !formData.email || !formData.event_code}
                className="w-full"
                variant="web3"
              >
                {isRegistering ? 'Registering...' : 'Register for Event'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold gradient-text mb-2">Welcome, {participant.name}</h1>
          <p className="text-muted-foreground">Track your event progress and NFTs</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Participant Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Your Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="font-medium">Email:</span>
                <span className="text-muted-foreground">{participant.email}</span>
              </div>
              {participant.team && (
                <div className="flex justify-between">
                  <span className="font-medium">Team:</span>
                  <span className="text-muted-foreground">{participant.team}</span>
                </div>
              )}
              {participant.telegram && (
                <div className="flex justify-between">
                  <span className="font-medium">Telegram:</span>
                  <span className="text-muted-foreground">{participant.telegram}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="font-medium">Wallet:</span>
                <span className="text-muted-foreground text-xs">
                  {address?.slice(0, 6)}...{address?.slice(-4)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* NFT Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" />
                NFT Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <StatusBadge status={participant.poa_minted} label="Proof of Attendance" />
              <StatusBadge status={participant.certificate_minted} label="Certificate" />
              <StatusBadge status={participant.telegram_verified} label="Telegram Verified" />
            </CardContent>
          </Card>
        </div>

        {/* Progress Tracker */}
        <Card>
          <CardHeader>
            <CardTitle>Event Progress</CardTitle>
            <CardDescription>Complete the steps below to earn your NFTs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg border border-primary/20 bg-primary/5">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  <span className="font-medium">Event Registration</span>
                </div>
                <Badge variant="default">Complete</Badge>
              </div>

              <div className={`flex items-center justify-between p-4 rounded-lg border ${
                participant.telegram_verified ? 'border-primary/20 bg-primary/5' : 'border-border bg-muted/20'
              }`}>
                <div className="flex items-center gap-3">
                  {participant.telegram_verified ? (
                    <CheckCircle className="h-5 w-5 text-primary" />
                  ) : (
                    <Clock className="h-5 w-5 text-muted-foreground" />
                  )}
                  <span className="font-medium">Telegram Verification</span>
                </div>
                {participant.telegram_verified ? (
                  <Badge variant="default">Complete</Badge>
                ) : (
                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                    Join Telegram <ExternalLink className="h-3 w-3" />
                  </Button>
                )}
              </div>

              <div className={`flex items-center justify-between p-4 rounded-lg border ${
                participant.poa_minted ? 'border-primary/20 bg-primary/5' : 'border-border bg-muted/20'
              }`}>
                <div className="flex items-center gap-3">
                  {participant.poa_minted ? (
                    <CheckCircle className="h-5 w-5 text-primary" />
                  ) : (
                    <Clock className="h-5 w-5 text-muted-foreground" />
                  )}
                  <span className="font-medium">Proof of Attendance NFT</span>
                </div>
                <Badge variant={participant.poa_minted ? "default" : "secondary"}>
                  {participant.poa_minted ? "Minted" : "Pending"}
                </Badge>
              </div>

              <div className={`flex items-center justify-between p-4 rounded-lg border ${
                participant.certificate_minted ? 'border-primary/20 bg-primary/5' : 'border-border bg-muted/20'
              }`}>
                <div className="flex items-center gap-3">
                  {participant.certificate_minted ? (
                    <CheckCircle className="h-5 w-5 text-primary" />
                  ) : (
                    <Clock className="h-5 w-5 text-muted-foreground" />
                  )}
                  <span className="font-medium">Certificate NFT</span>
                </div>
                <Badge variant={participant.certificate_minted ? "default" : "secondary"}>
                  {participant.certificate_minted ? "Minted" : "Pending"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}