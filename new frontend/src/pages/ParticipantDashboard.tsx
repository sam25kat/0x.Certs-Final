import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card-web3';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { CheckCircle, Clock, Shield, Award, ExternalLink, Loader2, Trophy, Medal, Calendar, Hash, Copy, Info, ChevronDown, ChevronUp, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import PixelBlast from '@/components/ui/PixelBlast';

export default function ParticipantDashboard() {
  const { address, isConnected } = useAccount();
  const [participantStatus, setParticipantStatus] = useState<any>(null);
  const [showStatus, setShowStatus] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [telegramVerified, setTelegramVerified] = useState(false);
  const [telegramVerifying, setTelegramVerifying] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [selectedInfo, setSelectedInfo] = useState<any>(null);
  const [showNetworkConfig, setShowNetworkConfig] = useState(false);
  const [notification, setNotification] = useState<{
    show: boolean;
    type: 'success' | 'error' | 'info';
    title: string;
    message: string;
  }>({
    show: false,
    type: 'info',
    title: '',
    message: ''
  });
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    team_name: '',
    telegram_username: '',
    event_code: '',
  });

  // Utility function to show notifications
  const showNotification = (type: 'success' | 'error' | 'info', title: string, message: string) => {
    setNotification({
      show: true,
      type,
      title,
      message
    });
    
    // Auto-hide after 4 seconds
    setTimeout(() => {
      setNotification(prev => ({ ...prev, show: false }));
    }, 4000);
  };

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
    
    setIsRefreshing(true);
    try {
      const result = await api.getParticipantStatusFromDB(address);
      setParticipantStatus(result);
      showNotification('success', 'Refreshed', 'Your NFT status has been updated');
    } catch (error) {
      console.error('Error loading NFT status:', error);
      showNotification('error', 'Refresh Failed', 'Unable to update your NFT status. Please try again.');
    } finally {
      setIsRefreshing(false);
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
      showNotification('error', 'Missing username', 'Please enter your Telegram username to verify membership');
      return;
    }

    // Remove @ if user included it
    const cleanUsername = username.startsWith('@') ? username.slice(1) : username;
    
    // Basic username format validation
    if (!/^[a-zA-Z0-9_]{5,32}$/.test(cleanUsername)) {
      showNotification('error', 'Invalid username format', 'Username should be 5-32 characters and contain only letters, numbers, and underscores.');
      return;
    }

    setTelegramVerifying(true);
    
    try {
      await api.verifyTelegramMembership(cleanUsername);
      setTelegramVerified(true);
      setFormData(prev => ({ ...prev, telegram_username: cleanUsername }));
      showNotification('success', 'Verification successful', `Welcome to the community! @${cleanUsername} has been verified successfully.`);
    } catch (error) {
      setTelegramVerified(false);
      const errorMsg = error instanceof Error ? error.message : 'Verification failed';
      
      if (errorMsg.includes('not a member')) {
        showNotification('error', 'Not a member', `@${cleanUsername} is not a member of our Telegram community yet. Please join our community first.`);
      } else if (errorMsg.includes('user not found')) {
        showNotification('error', 'User not found', `Telegram user @${cleanUsername} not found. Please check your username spelling.`);
      } else {
        showNotification('error', 'Verification failed', errorMsg);
      }
    } finally {
      setTelegramVerifying(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isConnected || !address) {
      showNotification('error', 'Wallet not connected', 'Please connect your wallet to register');
      return;
    }

    if (!formData.telegram_username) {
      showNotification('error', 'Telegram username required', 'Please enter your Telegram username to continue');
      return;
    }

    if (!telegramVerified) {
      showNotification('error', 'Telegram not verified', 'Please verify your Telegram community membership first');
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
      
      showNotification('success', 'Registration successful', `Successfully registered for "${result.event_name}"`);
      
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
          showNotification('error', 'Wallet Already Registered', `${errorMessage}. Please use a different wallet address or contact support if this is incorrect.`);
          return;
        } else if (errorMessage.includes('already completed the full process')) {
          showNotification('error', 'Already Completed', errorMessage);
          return;
        } else if (errorMessage.includes('Event not found') || errorMessage.includes('not found')) {
          showNotification('error', 'Event not found', 'Event not found. Please check the event code and try again.');
          return;
        }
      }
      
      showNotification('error', 'Registration failed', errorMessage);
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

  const handleInfoClick = (type: 'poa' | 'certificate', nftStatus: any, eventId: string) => {
    setSelectedInfo({
      type,
      eventId,
      eventName: nftStatus.event_name || `Event #${eventId}`,
      tokenId: type === 'poa' ? nftStatus.poa_token_id : nftStatus.certificate_token_id,
      status: type === 'poa' ? nftStatus.poa_status : nftStatus.certificate_status,
      transferredAt: type === 'poa' ? nftStatus.poa_transferred_at : nftStatus.certificate_transferred_at,
      contractAddress: "0xf55562677316d7620d5ebee2d9691a7ce3485740" // Actual contract address for both PoA and Certificate
    });
    setShowInfoModal(true);
  };

  const NetworkConfigDropdown = () => (
    <div className="mt-4 border border-green-600/30 rounded-lg bg-gray-800/40 overflow-hidden">
      <button
        onClick={() => setShowNetworkConfig(!showNetworkConfig)}
        className="w-full flex items-center justify-between p-3 text-left text-white hover:bg-green-600/10 transition-colors"
      >
        <div className="flex items-center justify-between w-full">
          <div>
            <span className="text-sm font-medium">Kaia Testnet Network Configuration</span>
            <div className="text-xs text-gray-400 mt-1">Add network with one click or manual setup</div>
          </div>
          <Button
            asChild
            variant="default"
            size="sm"
            className="bg-green-600 hover:bg-green-700 text-white shrink-0 ml-3"
          >
            <a
              href="https://chainlist.org/?search=kaia+kairos+testnet&testnets=true"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1"
            >
              <ExternalLink className="h-3 w-3" />
              One-Click Setup
            </a>
          </Button>
        </div>
        {showNetworkConfig ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      
      {showNetworkConfig && (
        <div className="p-4 border-t border-green-600/20 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <div className="text-green-400 font-medium mb-1">Network Name:</div>
              <div className="text-gray-300 font-mono bg-gray-900/50 p-2 rounded">Kaia Testnet Kairos</div>
            </div>
            <div>
              <div className="text-green-400 font-medium mb-1">Chain ID:</div>
              <div className="text-gray-300 font-mono bg-gray-900/50 p-2 rounded">1001</div>
            </div>
            <div>
              <div className="text-green-400 font-medium mb-1">RPC URL:</div>
              <div className="text-gray-300 font-mono bg-gray-900/50 p-2 rounded break-all">https://public-en-kairos.node.kaia.io</div>
            </div>
            <div>
              <div className="text-green-400 font-medium mb-1">Block Explorer:</div>
              <div className="text-gray-300 font-mono bg-gray-900/50 p-2 rounded break-all">https://kairos.kaiascan.io</div>
            </div>
            <div>
              <div className="text-green-400 font-medium mb-1">Currency Symbol:</div>
              <div className="text-gray-300 font-mono bg-gray-900/50 p-2 rounded">KAIA</div>
            </div>
            <div>
              <div className="text-green-400 font-medium mb-1">Currency Name:</div>
              <div className="text-gray-300 font-mono bg-gray-900/50 p-2 rounded">KAIA</div>
            </div>
          </div>
          <div className="mt-3 p-3 bg-green-600/10 rounded border border-green-600/20">
            <div className="text-green-400 text-xs font-medium mb-3">Setup Instructions:</div>

            {/* Side-by-side setup methods - centered container */}
            <div className="flex justify-center">
              <div className="grid md:grid-cols-2 gap-3 w-fit">
                {/* Method 1: One-Click Setup */}
                <div className="p-3 bg-green-500/10 border border-green-500/20 rounded">
                  <div className="text-green-300 text-xs font-medium mb-2">One-Click Setup (Recommended):</div>
                  <div className="text-gray-300 text-xs space-y-1">
                    <div>1. Click "One-Click Setup" button above</div>
                    <div>2. Connect your wallet on ChainList</div>
                    <div>3. Approve network addition in wallet</div>
                  </div>
                </div>

                {/* Method 2: Manual Setup */}
                <div className="p-3 bg-gray-600/10 border border-gray-600/20 rounded">
                  <div className="text-gray-400 text-xs font-medium mb-2">Manual Setup:</div>
                  <div className="text-gray-300 text-xs space-y-1">
                    <div>1. Open MetaMask → Settings → Networks → Add Network</div>
                    <div>2. Fill in the details above</div>
                    <div>3. Save and switch to Kaia Testnet network</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const NotificationModal = () => {
    if (!notification.show) return null;

    const getIcon = () => {
      switch (notification.type) {
        case 'success':
          return <CheckCircle2 className="h-6 w-6 text-green-400" />;
        case 'error':
          return <AlertCircle className="h-6 w-6 text-red-400" />;
        case 'info':
          return <Info className="h-6 w-6 text-blue-400" />;
        default:
          return <Info className="h-6 w-6 text-blue-400" />;
      }
    };

    const getBorderColor = () => {
      switch (notification.type) {
        case 'success':
          return 'border-green-500/40';
        case 'error':
          return 'border-red-500/40';
        case 'info':
          return 'border-blue-500/40';
        default:
          return 'border-blue-500/40';
      }
    };

    const getBackgroundColor = () => {
      switch (notification.type) {
        case 'success':
          return 'bg-green-900/20';
        case 'error':
          return 'bg-red-900/20';
        case 'info':
          return 'bg-blue-900/20';
        default:
          return 'bg-blue-900/20';
      }
    };

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div 
          className={`bg-gray-900 border ${getBorderColor()} rounded-lg max-w-md w-full transform transition-all duration-300 scale-100 opacity-100 animate-in fade-in slide-in-from-bottom-4`}
          style={{
            animation: 'slideInFromBottom 0.3s ease-out'
          }}
        >
          <div className={`p-6 rounded-lg ${getBackgroundColor()}`}>
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                {getIcon()}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-white mb-2">
                  {notification.title}
                </h3>
                <p className="text-gray-300 text-sm leading-relaxed">
                  {notification.message}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setNotification(prev => ({ ...prev, show: false }))}
                className="text-gray-400 hover:text-white flex-shrink-0 h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const InfoModal = () => {
    if (!showInfoModal || !selectedInfo) return null;

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-gray-900 border border-green-600/40 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                {selectedInfo.type === 'poa' ? <Medal className="h-5 w-5 text-green-400" /> : <Trophy className="h-5 w-5 text-green-400" />}
                {selectedInfo.type === 'poa' ? 'Proof of Attendance' : 'Certificate NFT'} Details
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowInfoModal(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </Button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-green-400 text-sm font-medium mb-1">Event:</div>
                  <div className="text-white">{selectedInfo.eventName}</div>
                </div>
                <div>
                  <div className="text-green-400 text-sm font-medium mb-1">Token ID:</div>
                  <div className="text-white font-mono">#{selectedInfo.tokenId}</div>
                </div>
                <div>
                  <div className="text-green-400 text-sm font-medium mb-1">Status:</div>
                  <div className="text-white">{selectedInfo.status}</div>
                </div>
                {selectedInfo.transferredAt && (
                  <div>
                    <div className="text-green-400 text-sm font-medium mb-1">Received:</div>
                    <div className="text-white text-sm">{new Date(selectedInfo.transferredAt).toLocaleString()}</div>
                  </div>
                )}
              </div>

              <div className="border border-green-600/30 rounded-lg bg-gray-800/40 p-4">
                <div className="text-green-400 text-sm font-medium mb-2">Contract Address:</div>
                <div className="flex items-center gap-2">
                  <div className="text-white font-mono text-sm bg-gray-900/50 p-2 rounded flex-1 break-all">
                    {selectedInfo.contractAddress}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(selectedInfo.contractAddress);
                      showNotification('success', 'Copied', 'Contract address copied to clipboard');
                    }}
                    className="text-green-400 hover:text-green-300 hover:bg-green-600/10 shrink-0"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <div className="text-gray-400 text-xs mt-2">
                  Use this address when importing your NFT to MetaMask or other wallets
                </div>
              </div>

              <NetworkConfigDropdown />

              <div className="border border-green-600/30 rounded-lg bg-gray-800/40 p-4">
                <div className="text-gray-300 text-sm space-y-3 max-h-60 overflow-y-auto">
                      
                  {selectedInfo.type === 'poa' && (
                    <div className="bg-orange-900/15 p-4 rounded-lg border border-orange-500/20">
                      <div className="flex items-center gap-2 mb-3">
                        <Medal className="h-5 w-5 text-orange-400" />
                        <h4 className="text-orange-200 font-semibold">Proof of Attendance (PoA) NFT</h4>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400">Token ID:</span>
                          <span className="text-white font-mono bg-gray-800/50 px-2 py-1 rounded">#{selectedInfo.tokenId}</span>
                        </div>
                        
                        {selectedInfo.status === 'registered' && (
                          <div className="bg-yellow-900/20 p-3 rounded border border-yellow-600/30">
                            <p className="text-yellow-200 text-sm">
                              <strong>Status:</strong> Waiting for mint. If you've been waiting too long, please contact your event organizer for assistance.
                            </p>
                          </div>
                        )}
                        
                        {selectedInfo.status === 'transferred' && (
                          <div className="mt-3">
                            <h5 className="text-orange-300 font-medium mb-2">Import to Wallet:</h5>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="bg-gray-800/30 p-2 rounded">1. Open MetaMask → NFTs</div>
                              <div className="bg-gray-800/30 p-2 rounded">2. Click "Import NFT"</div>
                              <div className="bg-gray-800/30 p-2 rounded">3. Enter Contract & Token ID</div>
                              <div className="bg-gray-800/30 p-2 rounded">4. Click "Import"</div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {selectedInfo.type === 'certificate' && (
                    <div className="bg-green-900/15 p-4 rounded-lg border border-green-500/20">
                      <div className="flex items-center gap-2 mb-3">
                        <Trophy className="h-5 w-5 text-green-400" />
                        <h4 className="text-green-200 font-semibold">Proof of Completion (PoC) Certificate</h4>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400">Token ID:</span>
                          <span className="text-white font-mono bg-gray-800/50 px-2 py-1 rounded">#{selectedInfo.tokenId}</span>
                        </div>
                        
                        {selectedInfo.status === 'not_eligible' && (
                          <div className="bg-yellow-900/20 p-3 rounded border border-yellow-600/30">
                            <p className="text-yellow-200 text-sm">
                              <strong>Status:</strong> Not eligible yet. Complete your PoA requirements first. If you believe this is incorrect, please contact your event organizer.
                            </p>
                          </div>
                        )}
                        
                        {selectedInfo.status !== 'not_eligible' && (
                          <>
                            <div className="grid grid-cols-2 gap-2 text-xs text-gray-300">
                              <div><span className="text-green-400">Blockchain:</span> Kaia Testnet</div>
                              <div><span className="text-green-400">Type:</span> ERC-721 NFT</div>
                            </div>
                            
                            {(selectedInfo.status === 'transferred' || selectedInfo.status === 'completed') && (
                              <div className="mt-3">
                                <h5 className="text-green-300 font-medium mb-2">Import to Wallet:</h5>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  <div className="bg-gray-800/30 p-2 rounded">1. Open MetaMask → NFTs</div>
                                  <div className="bg-gray-800/30 p-2 rounded">2. Click "Import NFT"</div>
                                  <div className="bg-gray-800/30 p-2 rounded">3. Enter Contract & Token ID</div>
                                  <div className="bg-gray-800/30 p-2 rounded">4. Click "Import"</div>
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="bg-blue-900/15 p-4 rounded-lg border border-blue-500/20">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle className="h-5 w-5 text-blue-400" />
                      <h4 className="text-blue-200 font-semibold">Next Steps</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                      <div className="bg-gray-800/30 p-3 rounded flex items-center gap-2">
                        <span className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">1</span>
                        <span className="text-gray-200">Configure Kaia Testnet network</span>
                      </div>
                      <div className="bg-gray-800/30 p-3 rounded flex items-center gap-2">
                        <span className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">2</span>
                        <span className="text-gray-200">Import NFT to wallet</span>
                      </div>
                      <div className="bg-gray-800/30 p-3 rounded flex items-center gap-2">
                        <span className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">3</span>
                        <span className="text-gray-200">Share on social media</span>
                      </div>
                      <div className="bg-gray-800/30 p-3 rounded flex items-center gap-2">
                        <span className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">4</span>
                        <span className="text-gray-200">Keep as proof forever</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

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
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleInfoClick('poa', nftStatus, eventId)}
                          className="h-6 w-6 p-0 text-green-400 hover:text-green-300 hover:bg-green-600/10"
                        >
                          <Info className="h-3 w-3" />
                        </Button>
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
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleInfoClick('certificate', nftStatus, eventId)}
                          className="h-6 w-6 p-0 text-green-400 hover:text-green-300 hover:bg-green-600/10"
                        >
                          <Info className="h-3 w-3" />
                        </Button>
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
                              href="https://t.me/+dirp2IfH0FxlNWRl"
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
                  disabled={isRefreshing}
                  className={isRefreshing ? 'animate-spin' : ''}
                >
                  {isRefreshing ? '🔄' : 'Refresh'}
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
      <NotificationModal />
      <InfoModal />
      <style jsx>{`
        @keyframes slideInFromBottom {
          0% {
            transform: translateY(100px);
            opacity: 0;
          }
          100% {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}