import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card-web3';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { CheckCircle, Clock, Shield, Award, ExternalLink, Loader2 } from 'lucide-react';

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
      const result = await api.getParticipantStatus(address);
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
            description: `🚫 ${errorMessage}\n\nPlease use a different wallet address or contact support if this is incorrect.`,
            variant: "destructive",
          });
          return;
        } else if (errorMessage.includes('already completed the full process')) {
          toast({
            title: "Already Completed",
            description: `✅ ${errorMessage}`,
            variant: "destructive",
          });
          return;
        } else if (errorMessage.includes('Event not found') || errorMessage.includes('not found')) {
          toast({
            title: "Event not found",
            description: `❌ Event not found. Please check the event code and try again.`,
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


  const renderParticipantStatus = () => {
    if (!participantStatus || !participantStatus.events || Object.keys(participantStatus.events).length === 0) {
      return (
        <Card>
          <CardContent className="p-8 text-center">
            <Award className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No NFTs found for your wallet address.</p>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-4">
        {Object.entries(participantStatus.events).map(([eventId, nftStatus]: [string, any]) => {
          const getPoAStatusDisplay = () => {
            switch(nftStatus.poa_status) {
              case 'registered':
                return { text: '📝 Registered - Waiting for mint', color: 'bg-yellow-100 border-yellow-200', textColor: 'text-yellow-800' };
              case 'minted':
                return { text: '🏭 Minted - Waiting for transfer', color: 'bg-blue-100 border-blue-200', textColor: 'text-blue-800' };
              case 'transferred':
                return { text: `✅ PoA NFT Received #${nftStatus.poa_token_id}`, color: 'bg-green-100 border-green-200', textColor: 'text-green-800' };
              default:
                return { text: '❓ Unknown status', color: 'bg-red-100 border-red-200', textColor: 'text-red-800' };
            }
          };

          const getCertStatusDisplay = () => {
            switch(nftStatus.certificate_status) {
              case 'not_eligible':
                return { text: '⏳ Not eligible yet', color: 'bg-gray-100 border-gray-200', textColor: 'text-gray-800' };
              case 'eligible':
                return { text: '🎯 Eligible - Waiting for generation', color: 'bg-yellow-100 border-yellow-200', textColor: 'text-yellow-800' };
              case 'generated':
                return { text: '🏭 Generated - Waiting for mint', color: 'bg-blue-100 border-blue-200', textColor: 'text-blue-800' };
              case 'completed':
                return { text: `✅ Certificate Completed #${nftStatus.certificate_token_id || 'N/A'}`, color: 'bg-blue-100 border-blue-200', textColor: 'text-blue-800' };
              case 'minted':
                return { text: '🏭 Minted - Waiting for transfer', color: 'bg-blue-100 border-blue-200', textColor: 'text-blue-800' };
              case 'transferred':
                return { text: `🏆 Certificate NFT Received #${nftStatus.certificate_token_id}`, color: 'bg-green-100 border-green-200', textColor: 'text-green-800' };
              default:
                return { text: `❓ Unknown status: ${nftStatus.certificate_status}`, color: 'bg-red-100 border-red-200', textColor: 'text-red-800' };
            }
          };

          const poaStatus = getPoAStatusDisplay();
          const certStatus = getCertStatusDisplay();

          return (
            <Card key={eventId} className="border-2">
              <CardHeader>
                <CardTitle className="text-lg">Event ID: {eventId}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className={`p-4 rounded-lg border-2 ${poaStatus.color}`}>
                  <div className={`font-medium ${poaStatus.textColor}`}>
                    🎖️ PoA Status: {poaStatus.text}
                  </div>
                  {nftStatus.poa_transferred_at && (
                    <div className="text-sm text-muted-foreground mt-2">
                      Transferred: {new Date(nftStatus.poa_transferred_at).toLocaleString()}
                    </div>
                  )}
                </div>
                <div className={`p-4 rounded-lg border-2 ${certStatus.color}`}>
                  <div className={`font-medium ${certStatus.textColor}`}>
                    🏆 Certificate Status: {certStatus.text}
                  </div>
                  {nftStatus.certificate_transferred_at && (
                    <div className="text-sm text-muted-foreground mt-2">
                      Transferred: {new Date(nftStatus.certificate_transferred_at).toLocaleString()}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold gradient-text mb-2">🎖️ Participant Dashboard</h1>
          <p className="text-muted-foreground">Register for events and track your NFT progress</p>
          <div className="mt-4 text-sm text-muted-foreground">
            Connected wallet: {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Not connected'}
          </div>
        </div>

        <div className="space-y-6">
          {/* Registration Form - Always Visible */}
          <Card>
            <CardHeader>
              <CardTitle className="gradient-text">Event Registration</CardTitle>
              <CardDescription>
                Enter your details and event code to register
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
                <Card className={`${telegramVerified ? 'border-green-200 bg-green-50' : ''}`}>
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        📱 Telegram Community Verification *
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
                        : "Join our community and verify your membership (REQUIRED)"
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
                            '🔍 Verify'
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
                        <div className="font-medium text-sm">🚀 New Verification Process:</div>
                        <div className="space-y-2 text-sm text-muted-foreground">
                          <div><strong>Step 1:</strong> Join our Telegram community</div>
                          <div><strong>Step 2:</strong> Message <code className="bg-background px-1.5 py-0.5 rounded text-xs">/0xday</code> in the community group</div>
                          <div><strong>Step 3:</strong> Enter your username above and verify</div>
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
                              📱 Join Community
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </Button>
                          <Badge variant="secondary" className="flex items-center gap-1">
                            ⚡ Then type: /0xday
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground italic">
                          💡 <strong>Tip:</strong> You can message /0xday directly in the community group or privately to our bot @Certs0xDay_bot
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
                        🔒 Telegram Username Required
                      </>
                    ) : !telegramVerified ? (
                      <>
                        🔒 Complete Telegram Verification First
                      </>
                    ) : (
                      <>
                        🚀 Register for Event
                      </>
                    )
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Status Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" />
                🎖️ My NFT Status
              </CardTitle>
              <CardDescription>
                Your NFT progress across all events
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
                  🔄 Refresh
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
  );
}