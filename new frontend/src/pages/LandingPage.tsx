import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ChevronRight, Settings, Wallet, Users, Award, Shield, ExternalLink, Copy, ChevronDown, ChevronUp, Info, AlertCircle, CheckCircle, Download, Eye } from 'lucide-react';
import { Footer } from '@/components/layout/Footer';
import Orb from '@/components/ui/Orb';
import SplashCursor from '@/components/ui/SplashCursor';
import Lanyard from '@/components/ui/Lanyard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card-web3';
import { useState } from 'react';

export default function LandingPage() {
  console.log('🏠 LandingPage: Component is rendering');
  const [showNetworkInfo, setShowNetworkInfo] = useState(false);
  const [showImportInfo, setShowImportInfo] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState('');

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAddress(type);
    setTimeout(() => setCopiedAddress(''), 2000);
  };

  return (
    <div className="min-h-screen">
      {/* Fluid Splash Cursor Effect */}
      <SplashCursor />

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background/80 to-background/90"></div>
        
        {/* Orb Background */}
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <div className="w-[350vw] h-[350vw] max-w-[3500px] max-h-[3500px] sm:w-[900px] sm:h-[900px] md:w-[1000px] md:h-[1000px] lg:w-[1100px] lg:h-[1100px] xl:w-[1200px] xl:h-[1200px] opacity-40">
            <Orb
              hue={152}
              hoverIntensity={0.5}
              rotateOnHover={true}
              forceHoverState={false}
            />
          </div>
        </div>
        
        <div className="container mx-auto px-4 relative z-30 pointer-events-none">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-7xl md:text-9xl font-bold -mb-6 fira-code-bold">
              <span className="text-white">0x</span><span className="gradient-text">.Certs</span>
            </h1>
            <div className="flex items-center justify-center gap-3 -mb-6">
              <span className="text-lg text-muted-foreground">A product by</span>
              <a href="https://0x.day/" target="_blank" rel="noopener noreferrer">
                <img src="/logo.png" alt="0x.Day Logo" className="h-48 w-auto" />
              </a>
            </div>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              The future of certificates and PoAs in the digital NFT space is here!<br />
              Secure, verified, and seamlessly powered by Web3.
            </p>
            <div className="flex justify-center pointer-events-auto">
              <Link to="/participant">
                <Button size="lg" variant="default" className="min-w-[250px]">
                  START MINTING
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Lanyard Split Section */}
      <section className="pt-40 md:pt-60 py-20 md:py-32 pb-32 md:pb-48">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left side - Lanyard Component */}
            <div className="relative h-[600px] overflow-hidden rounded-lg bg-gradient-to-br from-primary/5 to-primary/10">
              <Lanyard />
            </div>
            
            {/* Right side - Content */}
            <div className="space-y-6">
              <h2 className="text-3xl md:text-4xl font-bold text-white">
                Experience the Future of Digital Credentials
              </h2>
              <p className="text-lg text-muted-foreground">
                Our platform transforms traditional certificates into interactive, verifiable NFT tokens. 
                Experience your achievements through digital blockchain-based credentials, powered by cutting-edge Web3 technology.
              </p>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-white">Digital Experience</h3>
                    <p className="text-muted-foreground">Interactive NFT-based certificates that showcase your achievements</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-white">Blockchain Verified</h3>
                    <p className="text-muted-foreground">Tamper-proof credentials secured on the blockchain</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Award className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-white">Universally Recognized</h3>
                    <p className="text-muted-foreground">Share and verify your credentials anywhere in the Web3 ecosystem</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="pt-2 md:pt-4 py-20 md:py-32 bg-muted/20">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-lg text-muted-foreground">
              Your complete guide to earning verifiable Web3 certificates and NFTs
            </p>
          </div>

          <div className="max-w-6xl mx-auto">
            {/* Main Steps Grid */}
            <div className="grid lg:grid-cols-3 gap-8 mb-16">
              {/* Step 1 - Connect Wallet */}
              <Card className="gradient-card border-primary/20 hover:border-primary/40 transition-all duration-300">
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto mb-4 p-6 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 w-fit">
                    <Wallet className="h-8 w-8 text-primary" />
                  </div>
                  <div className="mx-auto mb-3 px-3 py-1 rounded-full bg-primary/20 w-fit">
                    <span className="text-sm font-bold text-primary">STEP 1</span>
                  </div>
                  <CardTitle className="text-xl text-white">Connect Your Wallet</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-gray-300 text-center">
                    Connect your Web3 wallet for secure, decentralized authentication
                  </p>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/20">
                      <Shield className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-gray-200 font-medium">Supported Wallets</p>
                        <p className="text-gray-400">MetaMask, WalletConnect, Coinbase Wallet, and more</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/20">
                      <AlertCircle className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-gray-200 font-medium">New to Web3?</p>
                        <p className="text-gray-400">Download MetaMask from metamask.io - it's free and secure</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Step 2 - Join Event */}
              <Card className="gradient-card border-primary/20 hover:border-primary/40 transition-all duration-300">
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto mb-4 p-6 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 w-fit">
                    <Users className="h-8 w-8 text-primary" />
                  </div>
                  <div className="mx-auto mb-3 px-3 py-1 rounded-full bg-primary/20 w-fit">
                    <span className="text-sm font-bold text-primary">STEP 2</span>
                  </div>
                  <CardTitle className="text-xl text-white">Join Event</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-gray-300 text-center">
                    Register for events using your unique 6-digit event code
                  </p>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/20">
                      <Info className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-gray-200 font-medium">Event Code</p>
                        <p className="text-gray-400">Get your code from event organizers or registration emails</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/20">
                      <Users className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-gray-200 font-medium">Telegram Verification</p>
                        <p className="text-gray-400">Join our community for updates and networking</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Step 3 - Earn NFTs */}
              <Card className="gradient-card border-primary/20 hover:border-primary/40 transition-all duration-300">
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto mb-4 p-6 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 w-fit">
                    <Award className="h-8 w-8 text-primary" />
                  </div>
                  <div className="mx-auto mb-3 px-3 py-1 rounded-full bg-primary/20 w-fit">
                    <span className="text-sm font-bold text-primary">STEP 3</span>
                  </div>
                  <CardTitle className="text-xl text-white">Earn NFTs</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-gray-300 text-center">
                    Complete events and receive verifiable NFT certificates
                  </p>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/20">
                      <Award className="h-4 w-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-gray-200 font-medium">Proof of Attendance (PoA)</p>
                        <p className="text-gray-400">Automatic NFT for attending the event</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/20">
                      <Award className="h-4 w-4 text-purple-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-gray-200 font-medium">Achievement Certificates</p>
                        <p className="text-gray-400">Official NFT certificates for event completion and attendance</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Network Information Card */}
            <Card className="gradient-card border-primary/20 mb-8">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/20">
                      <Settings className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg text-white">Network Configuration</CardTitle>
                      <p className="text-gray-400 text-sm">Configure your wallet for Kaia Testnet network</p>
                      <div className="mt-3 p-4 bg-primary/10 border border-primary/20 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-primary font-medium text-sm">Quick Network Setup</p>
                            <p className="text-gray-300 text-xs">Add Kaia Testnet with one click</p>
                          </div>
                          <Button
                            asChild
                            variant="default"
                            size="sm"
                            className="bg-primary hover:bg-primary/90 ml-4"
                          >
                            <a
                              href="https://chainlist.org/?search=kaia+kairos+testnet&testnets=true"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2"
                            >
                              <ExternalLink className="h-3 w-3" />
                              One-Click Setup
                            </a>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowNetworkInfo(!showNetworkInfo)}
                    className="text-primary hover:bg-primary/10"
                  >
                    {showNetworkInfo ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </div>
              </CardHeader>
              {showNetworkInfo && (
                <CardContent className="border-t border-border/50 pt-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="text-primary font-medium text-sm">Network Name</label>
                        <div className="flex items-center gap-2 mt-1">
                          <code className="flex-1 p-2 bg-muted/20 rounded text-gray-300 font-mono text-sm">Kaia Testnet Kairos</code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard('Kaia Testnet Kairos', 'name')}
                            className="text-gray-400 hover:text-white"
                          >
                            {copiedAddress === 'name' ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                      <div>
                        <label className="text-primary font-medium text-sm">Chain ID</label>
                        <div className="flex items-center gap-2 mt-1">
                          <code className="flex-1 p-2 bg-muted/20 rounded text-gray-300 font-mono text-sm">1001</code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard('1001', 'chainId')}
                            className="text-gray-400 hover:text-white"
                          >
                            {copiedAddress === 'chainId' ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                      <div>
                        <label className="text-primary font-medium text-sm">Currency</label>
                        <div className="flex items-center gap-2 mt-1">
                          <code className="flex-1 p-2 bg-muted/20 rounded text-gray-300 font-mono text-sm">KAIA</code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard('KAIA', 'currency')}
                            className="text-gray-400 hover:text-white"
                          >
                            {copiedAddress === 'currency' ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="text-primary font-medium text-sm">RPC URL</label>
                        <div className="flex items-center gap-2 mt-1">
                          <code className="flex-1 p-2 bg-muted/20 rounded text-gray-300 font-mono text-sm break-all">https://public-en-kairos.node.kaia.io</code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard('https://public-en-kairos.node.kaia.io', 'rpc')}
                            className="text-gray-400 hover:text-white"
                          >
                            {copiedAddress === 'rpc' ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                      <div>
                        <label className="text-primary font-medium text-sm">Block Explorer</label>
                        <div className="flex items-center gap-2 mt-1">
                          <code className="flex-1 p-2 bg-muted/20 rounded text-gray-300 font-mono text-sm break-all">https://kairos.kaiascan.io</code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard('https://kairos.kaiascan.io', 'explorer')}
                            className="text-gray-400 hover:text-white"
                          >
                            {copiedAddress === 'explorer' ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Info className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-blue-400 font-medium text-sm mb-3">Setup Instructions</p>

                        {/* Side-by-side setup methods - centered container */}
                        <div className="flex justify-center">
                          <div className="grid md:grid-cols-2 gap-4 w-fit">
                            {/* Method 1: One-Click Setup */}
                            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                              <p className="text-green-400 font-medium text-sm mb-3">Method 1: One-Click Setup (Recommended)</p>
                              <ol className="text-gray-300 text-sm space-y-2 list-decimal list-inside">
                                <li>Click the "One-Click Setup" button above</li>
                                <li>Select "Connect Wallet" on ChainList</li>
                                <li>Approve the network addition in your wallet</li>
                                <li>You're ready to import NFTs</li>
                              </ol>
                            </div>

                            {/* Method 2: Manual Setup */}
                            <div className="p-4 bg-gray-500/10 border border-gray-500/20 rounded-lg">
                              <p className="text-gray-400 font-medium text-sm mb-3">Method 2: Manual Setup</p>
                              <ol className="text-gray-300 text-sm space-y-2 list-decimal list-inside">
                                <li>Open MetaMask → Settings → Networks → Add Network</li>
                                <li>Fill in the network details above</li>
                                <li>Save and switch to Kaia Testnet network</li>
                                <li>You're ready to import NFTs</li>
                              </ol>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Benefits Section */}
            <div className="grid md:grid-cols-2 gap-8 mb-8">
              <Card className="gradient-card border-primary/20">
                <CardHeader>
                  <CardTitle className="text-lg text-white flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    Why Web3 Certificates?
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0"></div>
                    <div>
                      <p className="text-gray-200 font-medium">Permanent & Tamper-Proof</p>
                      <p className="text-gray-400">Stored on blockchain forever, cannot be faked or lost</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0"></div>
                    <div>
                      <p className="text-gray-200 font-medium">Instantly Verifiable</p>
                      <p className="text-gray-400">Anyone can verify authenticity in seconds</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0"></div>
                    <div>
                      <p className="text-gray-200 font-medium">Portable & Universal</p>
                      <p className="text-gray-400">Works across all platforms and applications</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0"></div>
                    <div>
                      <p className="text-gray-200 font-medium">No More Lost Certificates</p>
                      <p className="text-gray-400">Never worry about losing important credentials again</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="gradient-card border-primary/20">
                <CardHeader>
                  <CardTitle className="text-lg text-white flex items-center gap-2">
                    <Award className="h-5 w-5 text-primary" />
                    What You'll Get
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-yellow-400 mt-2 flex-shrink-0"></div>
                    <div>
                      <p className="text-gray-200 font-medium">Proof of Attendance NFT</p>
                      <p className="text-gray-400">Unique NFT proving you attended the event</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-purple-400 mt-2 flex-shrink-0"></div>
                    <div>
                      <p className="text-gray-200 font-medium">Achievement Certificates</p>
                      <p className="text-gray-400">Official NFT certificates for event completion and attendance</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-blue-400 mt-2 flex-shrink-0"></div>
                    <div>
                      <p className="text-gray-200 font-medium">Digital Portfolio</p>
                      <p className="text-gray-400">Build your verifiable Web3 credential portfolio</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-400 mt-2 flex-shrink-0"></div>
                    <div>
                      <p className="text-gray-200 font-medium">Community Access</p>
                      <p className="text-gray-400">Join exclusive holder communities and events</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* NFT Import Instructions */}
            <Card className="gradient-card border-primary/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/20">
                      <Download className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg text-white">Import Your NFTs to Wallet</CardTitle>
                      <p className="text-gray-400 text-sm">View your certificates in MetaMask and other wallets</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowImportInfo(!showImportInfo)}
                    className="text-primary hover:bg-primary/10"
                  >
                    {showImportInfo ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </div>
              </CardHeader>
              {showImportInfo && (
                <CardContent className="border-t border-border/50 pt-6">
                  <div className="space-y-6">
                    {/* Contract Address */}
                    <div>
                      <label className="text-primary font-medium text-sm mb-2 block">Contract Address</label>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 p-3 bg-muted/20 rounded text-gray-300 font-mono text-sm break-all">
                          0x96A4A39ae899cf43eEBDC980D0B87a07bc9211d7
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard('0x96A4A39ae899cf43eEBDC980D0B87a07bc9211d7', 'contract')}
                          className="text-gray-400 hover:text-white"
                        >
                          {copiedAddress === 'contract' ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                      <p className="text-gray-400 text-xs mt-1">
                        Use this address when importing your NFT to MetaMask or other wallets
                      </p>
                    </div>

                    {/* Import Steps */}
                    <div>
                      <h4 className="text-white font-medium mb-4 flex items-center gap-2">
                        <Eye className="h-4 w-4 text-primary" />
                        Import Steps for MetaMask
                      </h4>
                      <div className="grid md:grid-cols-2 gap-3">
                        <div className="bg-muted/20 p-3 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="bg-primary text-black rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">1</span>
                            <span className="text-gray-200 font-medium">Open MetaMask</span>
                          </div>
                          <p className="text-gray-400 text-sm">Navigate to the NFTs tab in your MetaMask wallet</p>
                        </div>
                        <div className="bg-muted/20 p-3 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="bg-primary text-black rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">2</span>
                            <span className="text-gray-200 font-medium">Click "Import NFT"</span>
                          </div>
                          <p className="text-gray-400 text-sm">Look for the "Import NFT" button at the bottom</p>
                        </div>
                        <div className="bg-muted/20 p-3 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="bg-primary text-black rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">3</span>
                            <span className="text-gray-200 font-medium">Enter Details</span>
                          </div>
                          <p className="text-gray-400 text-sm">Paste the contract address and your Token ID (Find it in the email)</p>
                        </div>
                        <div className="bg-muted/20 p-3 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="bg-primary text-black rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">4</span>
                            <span className="text-gray-200 font-medium">Click "Import"</span>
                          </div>
                          <p className="text-gray-400 text-sm">Your NFT will appear in your wallet collection</p>
                        </div>
                      </div>
                    </div>

                    {/* Important Notes */}
                    <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                      <div className="flex items-start gap-3">
                        <Info className="h-5 w-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-yellow-400 font-medium text-sm mb-2">Important Notes</p>
                          <ul className="text-gray-300 text-sm space-y-1 list-disc list-inside">
                            <li>You'll need your specific Token ID (Find it in the email)</li>
                            <li>Make sure you're connected to the Kaia Testnet network</li>
                            <li>The same contract address works for both PoA and Certificate NFTs</li>
                            <li>Your NFTs will only be visible after they've been transferred to your wallet</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    {/* Other Wallets */}
                    <div>
                      <h4 className="text-white font-medium mb-3">Other Wallets</h4>
                      <div className="grid md:grid-cols-3 gap-4 text-sm">
                        <div className="bg-muted/20 p-3 rounded-lg text-center">
                          <p className="text-gray-200 font-medium">Coinbase Wallet</p>
                          <p className="text-gray-400 text-xs mt-1">Similar import process via NFT section</p>
                        </div>
                        <div className="bg-muted/20 p-3 rounded-lg text-center">
                          <p className="text-gray-200 font-medium">Trust Wallet</p>
                          <p className="text-gray-400 text-xs mt-1">Use "Add Custom Token" feature</p>
                        </div>
                        <div className="bg-muted/20 p-3 rounded-lg text-center">
                          <p className="text-gray-200 font-medium">OpenSea</p>
                          <p className="text-gray-400 text-xs mt-1">View directly by connecting wallet</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          </div>
        </div>
      </section>

      {/* PoA Story Section */}
      <section className="py-20 md:py-32 bg-gradient-to-b from-background to-muted/20">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left side - Image */}
            <div className="relative">
              <div className="relative h-[500px] overflow-hidden rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                <img
                  src="/PoA.png"
                  alt="Proof of Attendance NFT by 0x.Day"
                  className="w-full h-full object-contain p-8"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/20 to-transparent"></div>
              </div>
            </div>

            {/* Right side - Content */}
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Award className="h-6 w-6 text-yellow-400" />
                  <span className="text-yellow-400 font-semibold">PROOF OF ATTENDANCE</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-white">
                  Innovation is Around You
                </h2>
                <p className="text-primary font-medium">Discover. Build. Lead.</p>
              </div>

              <div className="space-y-4 text-muted-foreground">
                <p>
                  The most memorable moments in building something aren't always the big milestones. Sometimes, it's watching hundreds of people connect with something you created from the heart.
                </p>
                <p>
                  When our beloved mascot first took the stage, the energy in the room was electric. It perfectly embodied our core belief: <span className="text-primary font-medium">"Innovation is around you, Discover. Build. Lead."</span>
                </p>
                <p>
                  Here's what makes this story special: this character didn't emerge from expensive design consultations or corporate meetings. Instead, it was inspired by something beautifully simple, a founder's evening reading sessions with their young daughter.
                </p>
                <p>
                  Through nightly storytelling rituals and children's book illustrations, a profound realization emerged: <span className="text-white font-medium">Breakthrough ideas often hide in the most ordinary moments. We just need to stay curious enough to spot them.</span>
                </p>
                <p>
                  This embodies the essence of 0x.Day. Innovation lives everywhere, in weekend hackathons, late-night coding sessions, casual conversations, and yes, even in bedtime stories. The best ideas don't wait for perfect timing or formal permission.
                </p>
                <p>
                  <span className="text-white font-medium">This mascot now serves as our PoA (Proof of Attendance) NFT</span>, a unique digital token that proves you were part of our innovation journey. When you attend our events, you receive this special NFT as permanent proof of your participation in the Web3 ecosystem.
                </p>
                <p className="text-white">
                  Our mascot has become more than visual identity, it's a philosophy. A reminder to our builders, our community, and everyone who witnessed its debut: <span className="text-primary">The next big breakthrough isn't hidden in some distant place. It's probably sitting right beside you, waiting to be discovered.</span>
                </p>
              </div>

              <div className="flex items-center gap-4 pt-4">
                <div className="p-3 bg-yellow-400/10 rounded-lg border border-yellow-400/20">
                  <Award className="h-6 w-6 text-yellow-400" />
                </div>
                <div>
                  <p className="text-white font-semibold">NFT Proof of Attendance</p>
                  <p className="text-sm text-muted-foreground">Secure your place in innovation history</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Certificate NFT Section */}
      <section className="py-20 md:py-32">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left side - Content */}
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Shield className="h-6 w-6 text-purple-400" />
                  <span className="text-purple-400 font-semibold">CERTIFICATE NFT</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-white">
                  Moving to a New Future
                </h2>
                <p className="text-primary font-medium">Where Achievements Live Forever</p>
              </div>

              <div className="space-y-4 text-muted-foreground">
                <p>
                  The future of credentials isn't paper certificates that fade or digital files that get lost. It's <span className="text-white font-medium">immutable, verifiable, and truly yours</span>, powered by blockchain technology.
                </p>
                <p>
                  Our Certificate NFTs represent more than just completion. They're proof of your journey, your growth, and your commitment to innovation. Each certificate is uniquely yours, stored permanently on the blockchain, and instantly verifiable by anyone, anywhere.
                </p>
                <p>
                  <span className="text-white font-medium">Beyond attendance, we also offer PoC (Proof of Completion) certificates</span> for those who complete our challenges and workshops. These blockchain-verified credentials showcase your achievements and skills in the decentralized future.
                </p>
                <p>
                  <span className="text-primary font-medium">Moving to a new future</span> means leaving behind the old ways of proving what you've accomplished. No more lost certificates, no more "please send me a copy" emails, no more doubts about authenticity.
                </p>
                <p className="text-white">
                  Your achievements deserve to be as permanent and innovative as the work you put in to earn them.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-white">Permanent & Tamper-Proof</h4>
                    <p className="text-muted-foreground text-sm">Your achievements, secured forever on the blockchain</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-white">Instantly Verifiable</h4>
                    <p className="text-muted-foreground text-sm">No need for third-party verification services</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Award className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-white">Truly Yours</h4>
                    <p className="text-muted-foreground text-sm">Own your credentials, control your narrative</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 pt-4">
                <div className="p-3 bg-purple-400/10 rounded-lg border border-purple-400/20">
                  <Shield className="h-6 w-6 text-purple-400" />
                </div>
                <div>
                  <p className="text-white font-semibold">NFT Achievement Certificate</p>
                  <p className="text-sm text-muted-foreground">The future of professional credentials</p>
                </div>
              </div>
            </div>

            {/* Right side - Image */}
            <div className="relative">
              <div className="relative h-[500px] overflow-hidden rounded-lg bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20">
                <img
                  src="/0x.day-cert.png"
                  alt="0x.Day Certificate NFT"
                  className="w-full h-full object-contain p-8"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/20 to-transparent"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 md:py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Ready to Get Started?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Join thousands of developers earning verifiable Web3 certificates
            </p>
            <div className="flex justify-center">
              <Link to="/participant">
                <Button size="lg" variant="default" className="min-w-[250px]">
                  MINT YOUR CERTIFICATES
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
      
      <Footer />
    </div>
  );
}