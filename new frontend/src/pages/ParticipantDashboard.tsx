import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card-web3';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { CheckCircle, Clock, Shield, Award, ExternalLink, Loader2, Trophy, Medal, Calendar, Hash, Copy } from 'lucide-react';
import PixelBlast from '@/components/ui/PixelBlast';

export default function ParticipantDashboard() {
  const { address, isConnected } = useAccount();
  const { toast } = useToast();
  const [participantStatus, setParticipantStatus] = useState<any>(null);
  const [showStatus, setShowStatus] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [telegramVerified, setTelegramVerified] = useState(false);
  const [telegramVerifying, setTelegramVerifying] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    team_name: '',
    telegram_username: '',
    event_code: '',
  });

  // Load user NFT status when wallet connects
  useEffect(() => {
    if (address) {
      loadUserNFTStatus();
    } else {
      setParticipantStatus(null);
    }
  }, [address]);

  const loadUserNFTStatus = async () => {
    if (!address) return;
    
    try {
      const result = await api.getParticipantStatusFromDB(address);
      setParticipantStatus(result);
    } catch (error) {
      console.error('Error loading NFT status:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Special handling for telegram username
    if (name === 'telegram_username') {
      // Clean the input and reset verification status
      const cleanValue = value.replace(/[^a-zA-Z0-9_@]/g, '');
      setFormData({ ...formData, [name]: cleanValue });
      
      // Reset verification if user starts typing again
      if (telegramVerified && cleanValue !== formData.telegram_username) {
        setTelegramVerified(false);
      }
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const verifyTelegramMembership = async () => {
    const username = formData.telegram_username.trim();
    
    if (!username) {
      toast({
        title: "Missing username",
        description: "Please enter your Telegram username to verify membership",
        variant: "destructive",
      });
      return;
    }

    // Remove @ if user included it
    const cleanUsername = username.startsWith('@') ? username.slice(1) : username;
    
    // Basic username format validation
    if (!/^[a-zA-Z0-9_]{5,32}$/.test(cleanUsername)) {
      toast({
        title: "Invalid username format",
        description: "Username should be 5-32 characters and contain only letters, numbers, and underscores.",
        variant: "destructive",
      });
      return;
    }

    setTelegramVerifying(true);
    
    try {
      await api.verifyTelegramMembership(cleanUsername);
      setTelegramVerified(true);
      setFormData(prev => ({ ...prev, telegram_username: cleanUsername }));
      toast({
        title: "Verification successful!",
        description: `Welcome to the community! @${cleanUsername} has been verified successfully.`,
      });
    } catch (error) {
      setTelegramVerified(false);
      const errorMsg = error instanceof Error ? error.message : 'Verification failed';
      
      if (errorMsg.includes('not a member')) {
        toast({
          title: "Not a member",
          description: `@${cleanUsername} is not a member of our Telegram community yet. Please join our community first.`,
          variant: "destructive",
        });
      } else if (errorMsg.includes('user not found')) {
        toast({
          title: "User not found",
          description: `Telegram user @${cleanUsername} not found. Please check your username spelling.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Verification failed",
          description: errorMsg,
          variant: "destructive",
        });
      }
    } finally {
      setTelegramVerifying(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isConnected || !address) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to register",
        variant: "destructive",
      });
      return;
    }

    if (!formData.telegram_username) {
      toast({
        title: "Telegram username required",
        description: "Please enter your Telegram username to continue",
        variant: "destructive",
      });
      return;
    }

    if (!telegramVerified) {
      toast({
        title: "Telegram not verified",
        description: "Please verify your Telegram community membership first",
        variant: "destructive",
      });
      return;
    }

    setIsRegistering(true);
    try {
      const result = await api.registerParticipant({
        event_code: formData.event_code,
        email: formData.email,
        name: formData.name,
        team_name: formData.team_name || undefined,
        wallet_address: address,
        telegram_username: formData.telegram_username,
      });
      
      toast({
        title: "Registration successful!",
        description: `Successfully registered for "${result.event_name}"!`,
      });
      
      // Reset form
      setFormData({
        name: '',
        email: '',
        team_name: '',
        telegram_username: '',
        event_code: '',
      });
      setTelegramVerified(false);
      loadUserNFTStatus();
    } catch (error) {
      console.error('Registration error:', error);
      let errorMessage = 'Registration failed';
      
      // Try to extract the actual error message from the API response
      if (error instanceof Error) {
        errorMessage = error.message;
        
        // Handle specific error cases
        if (errorMessage.includes('wallet address is already registered') || errorMessage.includes('already registered')) {
          toast({
            title: "Wallet Already Registered",
            description: `${errorMessage}\n\nPlease use a different wallet address or contact support if this is incorrect.`,
            variant: "destructive",
          });
          return;
        } else if (errorMessage.includes('already completed the full process')) {
          toast({
            title: "Already Completed",
            description: `${errorMessage}`,
            variant: "destructive",
          });
          return;
        } else if (errorMessage.includes('Event not found') || errorMessage.includes('not found')) {
          toast({
            title: "Event not found",
            description: `Event not found. Please check the event code and try again.`,
            variant: "destructive",
          });
          return;
        }
      }
      
      toast({
        title: "Registration failed",
        description: errorMessage,
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
      <div className="relative min-h-screen">
        {/* PixelBlast Background */}
        <div className="fixed inset-0 z-0">
          <PixelBlast
            variant="circle"
            pixelSize={6}
            color="#22c55e"
            patternScale={3}
            patternDensity={1.2}
            pixelSizeJitter={0.5}
            enableRipples
            rippleSpeed={0.4}
            rippleThickness={0.12}
            rippleIntensityScale={1.5}
            liquid
            liquidStrength={0.12}
            liquidRadius={1.2}
            liquidWobbleSpeed={5}
            speed={0.6}
            edgeFade={0.25}
            transparent
          />
        </div>
        
        {/* Content */}
        <div className="relative z-10 container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          <Card className="backdrop-blur-sm bg-background/80 border-2">
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
      </div>
    );
  }


  const renderParticipantStatus = () => {
    if (!participantStatus || !participantStatus.events || Object.keys(participantStatus.events).length === 0) {
      return (
        <Card className="backdrop-blur-sm bg-background/80">
          <CardContent className="p-8 text-center">
            <Award className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No NFTs found for your wallet address.</p>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-6">
        {Object.entries(participantStatus.events).map(([eventId, nftStatus]: [string, any]) => {
          const getPoAStatusInfo = () => {
            switch(nftStatus.poa_status) {
              case 'registered':
                return { 
                  text: 'Registered', 
                  subtext: 'Waiting for mint', 
                  icon: Clock,
                  badgeColor: 'bg-red-600 text-white'
                };
              case 'minted':
                return { 
                  text: 'Minted', 
                  subtext: 'Waiting for transfer', 
                  icon: Clock,
                  badgeColor: 'bg-red-600 text-white'
                };
              case 'transferred':
                return { 
                  text: 'NFT Received', 
                  subtext: `Token ID: #${nftStatus.poa_token_id}`, 
                  icon: CheckCircle,
                  badgeColor: 'bg-green-600 text-white'
                };
              default:
                return { 
                  text: 'Unknown Status', 
                  subtext: 'Please check back later', 
                  icon: Clock,
                  badgeColor: 'bg-red-600 text-white'
                };
            }
          };

          const getCertStatusInfo = () => {
            switch(nftStatus.certificate_status) {
              case 'not_eligible':
                return { 
                  text: 'Not Eligible', 
                  subtext: 'Complete PoA requirements first', 
                  icon: Clock,
                  badgeColor: 'bg-yellow-600 text-white'
                };
              case 'eligible':
                return { 
                  text: 'Eligible', 
                  subtext: 'Waiting for generation', 
                  icon: Clock,
                  badgeColor: 'bg-red-600 text-white'
                };
              case 'generated':
                return { 
                  text: 'Generated', 
                  subtext: 'Waiting for mint', 
                  icon: Clock,
                  badgeColor: 'bg-red-600 text-white'
                };
              case 'completed':
                return { 
                  text: 'Completed', 
                  subtext: `Token ID: #${nftStatus.certificate_token_id || 'N/A'}`, 
                  icon: CheckCircle,
                  badgeColor: 'bg-green-600 text-white'
                };
              case 'minted':
                return { 
                  text: 'Minted', 
                  subtext: 'Waiting for transfer', 
                  icon: Clock,
                  badgeColor: 'bg-red-600 text-white'
                };
              case 'transferred':
                return { 
                  text: 'Certificate Received', 
                  subtext: `Token ID: #${nftStatus.certificate_token_id}`, 
                  icon: CheckCircle,
                  badgeColor: 'bg-green-600 text-white'
                };
              default:
                return { 
                  text: 'Unknown Status', 
                  subtext: nftStatus.certificate_status || 'Please check back later', 
                  icon: Clock,
                  badgeColor: 'bg-red-600 text-white'
                };
            }
          };

          const poaInfo = getPoAStatusInfo();
          const certInfo = getCertStatusInfo();
          const PoAIcon = poaInfo.icon;
          const CertIcon = certInfo.icon;

          return (
            <Card key={eventId} className="border border-green-600/40 bg-gray-900/70 shadow-md hover:shadow-lg transition-all duration-300">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-600/10 rounded-lg">
                      <Hash className="h-5 w-5 text-green-400" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-semibold text-white">Event #{eventId}</CardTitle>
                      {nftStatus.event_name && (
                        <p className="text-sm text-gray-400">{nftStatus.event_name}</p>
                      )}
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => navigator.clipboard.writeText(eventId)}
                    className="h-8 w-8 p-0 text-gray-300 hover:text-white hover:bg-green-600/10"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* PoA Status */}
                <div className="relative overflow-hidden rounded-lg border border-green-600/30 bg-gray-800/40 p-4 transition-all duration-200">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <div className="p-2 bg-green-600/10 rounded-lg">
                        <Medal className="h-6 w-6 text-green-400" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-white">Proof of Attendance</h3>
                        <Badge className={`${poaInfo.badgeColor} border-0`}>
                          <PoAIcon className="h-3 w-3 mr-1" />
                          {poaInfo.text}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-400 mb-2">{poaInfo.subtext}</p>
                      {nftStatus.poa_transferred_at && (
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Calendar className="h-3 w-3" />
                          Received: {new Date(nftStatus.poa_transferred_at).toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Certificate Status */}
                <div className="relative overflow-hidden rounded-lg border border-green-600/30 bg-gray-800/40 p-4 transition-all duration-200">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <div className="p-2 bg-green-600/10 rounded-lg">
                        <Trophy className="h-6 w-6 text-green-400" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-white">Certificate NFT</h3>
                        <Badge className={`${certInfo.badgeColor} border-0`}>
                          <CertIcon className="h-3 w-3 mr-1" />
                          {certInfo.text}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-400 mb-2">{certInfo.subtext}</p>
                      {nftStatus.certificate_transferred_at && (
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Calendar className="h-3 w-3" />
                          Received: {new Date(nftStatus.certificate_transferred_at).toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <div className="relative min-h-screen">
      {/* PixelBlast Background */}
      <div className="fixed inset-0 z-0">
        <PixelBlast
          variant="circle"
          pixelSize={6}
          color="#22c55e"
          patternScale={3}
          patternDensity={1.2}
          pixelSizeJitter={0.5}
          enableRipples
          rippleSpeed={0.4}
          rippleThickness={0.12}
          rippleIntensityScale={1.5}
          liquid
          liquidStrength={0.12}
          liquidRadius={1.2}
          liquidWobbleSpeed={5}
          speed={0.6}
          edgeFade={0.25}
          transparent
        />
      </div>
      
      {/* Main Content */}
      <div className="relative z-10 container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold gradient-text mb-2">Participant Dashboard</h1>
          <p className="text-muted-foreground">Register for events and track your NFT progress</p>
        </div>

        <div className="space-y-8">
          {/* Registration Form - Always Visible */}
          <Card className="backdrop-blur-sm bg-background/80 border-2 mb-8">
            <CardHeader>
              <CardTitle className="gradient-text">Event Registration</CardTitle>
              <CardDescription>
                Enter your details and event code to register. Claim your certificate and attendance on-chain so you never have to scramble for proof of attendance again - no more begging friends for screenshots or hunting down event organizers for verification!
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleRegister} className="space-y-6">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Enter your full name"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="your@email.com"
                      required
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="team_name">Team Name (Optional)</Label>
                    <Input
                      id="team_name"
                      name="team_name"
                      value={formData.team_name}
                      onChange={handleInputChange}
                      placeholder="Team name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="event_code">6-Digit Event Code *</Label>
                    <Input
                      id="event_code"
                      name="event_code"
                      value={formData.event_code}
                      onChange={handleInputChange}
                      placeholder="123456"
                      maxLength={6}
                      required
                    />
                  </div>
                </div>

                {/* Telegram Verification Section */}
                <Card className={`backdrop-blur-sm ${telegramVerified ? 'border-green-200 bg-green-50/80' : 'bg-background/60'}`}>
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        Telegram Community Verification *
                        {telegramVerified && (
                          <Badge variant="default" className="bg-green-600">
                            VERIFIED
                          </Badge>
                        )}
                      </CardTitle>
                    </div>
                    <CardDescription>
                      {telegramVerified 
                        ? "Great! You're verified as a community member."
                        : "Join our exclusive community for insider updates, networking opportunities, and early access to events. Plus, we verify you're actually part of the crew - no fake registrations allowed!"
                      }
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <Input
                          id="telegram_username"
                          name="telegram_username"
                          value={formData.telegram_username}
                          onChange={handleInputChange}
                          placeholder="Enter your Telegram username (without @) *"
                          disabled={telegramVerified}
                          required
                          className={telegramVerified ? "bg-green-50 border-green-200" : ""}
                        />
                        {formData.telegram_username && !telegramVerified && (
                          <div className="text-xs mt-1 text-muted-foreground">
                            @{formData.telegram_username.startsWith('@') ? formData.telegram_username.slice(1) : formData.telegram_username}
                            {(() => {
                              const cleanUsername = formData.telegram_username.startsWith('@') 
                                ? formData.telegram_username.slice(1) 
                                : formData.telegram_username;
                              const isValid = /^[a-zA-Z0-9_]{5,32}$/.test(cleanUsername);
                              return isValid ? ' ✓' : ' ✗';
                            })()}
                          </div>
                        )}
                      </div>
                      
                      {!telegramVerified ? (
                        <Button
                          type="button"
                          onClick={verifyTelegramMembership}
                          disabled={telegramVerifying || !formData.telegram_username.trim()}
                          variant="outline"
                          size="default"
                          className="shrink-0"
                        >
                          {telegramVerifying ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Verifying...
                            </>
                          ) : (
                            'Verify'
                          )}
                        </Button>
                      ) : (
                        <div className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md">
                          <CheckCircle className="h-4 w-4" />
                          <span className="text-sm font-medium">Verified</span>
                        </div>
                      )}
                    </div>

                    {!telegramVerified && (
                      <div className="p-4 bg-muted rounded-lg space-y-3">
                        <div className="font-medium text-sm">Quick Verification (No Bots Allowed!):</div>
                        <div className="space-y-2 text-sm text-muted-foreground">
                          <div><strong>Step 1:</strong> Join our community - where the real Web3 builders hang out</div>
                          <div><strong>Step 2:</strong> Drop a <code className="bg-background px-1.5 py-0.5 rounded text-xs">/0xday</code> message to prove you're legit</div>
                          <div><strong>Step 3:</strong> Come back here and verify - we'll confirm you're not a bot!</div>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            asChild
                          >
                            <a 
                              href="https://t.me/+reGkAz3_w6syOWJl"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2"
                            >
                              Join Community
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </Button>
                          <Badge variant="default" className="flex items-center gap-1 bg-green-600 text-white font-semibold">
                            Then type: /0xday
                          </Badge>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Button
                  type="submit"
                  disabled={isRegistering || !formData.name || !formData.email || !formData.event_code || !formData.telegram_username || !telegramVerified}
                  className="w-full"
                  variant="web3"
                  size="lg"
                >
                  {isRegistering ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Registering...
                    </>
                  ) : (
                    !formData.telegram_username ? (
                      <>
                        Telegram Username Required
                      </>
                    ) : !telegramVerified ? (
                      <>
                        Complete Telegram Verification First
                      </>
                    ) : (
                      <>
                        Register for Event
                      </>
                    )
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Status Section */}
          <Card className="backdrop-blur-sm bg-background/80 border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" />
                MY CERTS & NFT
              </CardTitle>
              <CardDescription>
                Track your proof-of-attendance tokens and achievement certificates from all events you've participated in
              </CardDescription>
              <div className="flex gap-2 pt-2">
                <Button
                  onClick={() => setShowStatus(!showStatus)}
                  variant={showStatus ? "default" : "outline"}
                  size="sm"
                >
                  {showStatus ? 'Hide Status' : 'Show Status'}
                </Button>
                <Button
                  onClick={loadUserNFTStatus}
                  variant="ghost"
                  size="sm"
                >
                  Refresh
                </Button>
              </div>
            </CardHeader>
            {showStatus && (
              <CardContent>
                {renderParticipantStatus()}
              </CardContent>
            )}
          </Card>
        </div>
        </div>
      </div>
    </div>
  );
}