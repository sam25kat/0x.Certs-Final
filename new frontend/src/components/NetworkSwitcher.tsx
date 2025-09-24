import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card-web3';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Network, Plus } from 'lucide-react';

const KAIA_TESTNET_NETWORK = {
  chainId: '0x3E9', // 1001 in hex
  chainName: 'Kaia Testnet Kairos',
  nativeCurrency: {
    name: 'KAIA',
    symbol: 'KAIA',
    decimals: 18,
  },
  rpcUrls: ['https://public-en-kairos.node.kaia.io'],
  blockExplorerUrls: ['https://kairos.kaiascan.io'],
};

export function NetworkSwitcher() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending } = useSwitchChain();
  
  const isCorrectNetwork = chainId === 1001;

  const addKaiaTestnet = async () => {
    if (!window.ethereum) {
      alert('Please install MetaMask or another Web3 wallet');
      return;
    }

    try {
      // Try to switch to the network first
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: KAIA_TESTNET_NETWORK.chainId }],
      });
    } catch (switchError: unknown) {
      // If network doesn't exist, add it
      if ((switchError as { code?: number }).code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [KAIA_TESTNET_NETWORK],
          });
        } catch (addError) {
          console.error('Failed to add network:', addError);
          alert('Failed to add Kaia Testnet network. Please add it manually.');
        }
      } else {
        console.error('Failed to switch network:', switchError);
      }
    }
  };

  const switchToKaiaTestnet = () => {
    if (switchChain) {
      switchChain({ chainId: 1001 });
    } else {
      addKaiaTestnet();
    }
  };

  if (!isConnected || isCorrectNetwork) {
    return null;
  }

  return (
    <div className="w-full p-4 mb-6">
      <Alert className="border-yellow-200 bg-yellow-50">
        <AlertTriangle className="h-4 w-4 text-yellow-600" />
        <AlertDescription className="text-yellow-800">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <strong>Wrong network detected!</strong> Please switch to Kaia Testnet Kairos (Chain ID: 1001) to use this application.
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                asChild
                variant="default"
                size="sm"
                className="shrink-0 bg-primary hover:bg-primary/90"
              >
                <a
                  href="https://chainlist.org/?search=kaia+kairos+testnet&testnets=true"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1"
                >
                  Quick Setup
                </a>
              </Button>
              <Button
                onClick={switchToKaiaTestnet}
                disabled={isPending}
                variant="outline"
                size="sm"
                className="shrink-0"
              >
                {isPending ? (
                  'Switching...'
                ) : (
                  <>
                    <Network className="h-3 w-3 mr-2" />
                    Switch Network
                  </>
                )}
              </Button>
              <Button
                onClick={addKaiaTestnet}
                variant="outline"
                size="sm"
                className="shrink-0"
              >
                <Plus className="h-3 w-3 mr-2" />
                Add Network
              </Button>
            </div>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}

// Manual network addition instructions component
export function NetworkInstructions() {
  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Network className="h-5 w-5" />
          Manual Network Setup
        </CardTitle>
        <CardDescription>
          Quick setup recommended, or add the network manually if needed
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Side-by-side setup methods - centered container */}
        <div className="flex justify-center">
          <div className="grid md:grid-cols-2 gap-4 w-fit">
            {/* Quick Setup Section */}
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="text-sm font-medium text-green-800 mb-3">One-Click Setup (Recommended)</h4>
              <div className="mb-3">
                <Button
                  asChild
                  variant="default"
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 w-full"
                >
                  <a
                    href="https://chainlist.org/?search=kaia+kairos+testnet&testnets=true"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Setup Network
                  </a>
                </Button>
              </div>
              <div className="text-sm text-green-700 space-y-2">
                <p>1. Click the "Setup Network" button above</p>
                <p>2. Connect your wallet on ChainList</p>
                <p>3. Approve the network addition</p>
              </div>
            </div>

            {/* Manual Setup Section */}
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <h4 className="text-sm font-medium text-gray-800 mb-3">Manual Setup</h4>
              <div className="text-sm space-y-2 text-gray-700">
                <p><strong>1.</strong> Open your wallet (MetaMask, etc.)</p>
                <p><strong>2.</strong> Go to Networks → Add Network</p>
                <p><strong>3.</strong> Add the network details below</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-muted p-4 rounded-lg space-y-2 text-sm font-mono">
          <div><strong>Network Name:</strong> Kaia Testnet Kairos</div>
          <div><strong>RPC URL:</strong> https://public-en-kairos.node.kaia.io</div>
          <div><strong>Chain ID:</strong> 1001</div>
          <div><strong>Currency Symbol:</strong> KAIA</div>
          <div><strong>Block Explorer:</strong> https://kairos.kaiascan.io</div>
        </div>
        
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Kaia Kairos is a testnet. You can get testnet KAIA from the Kaia faucet.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}