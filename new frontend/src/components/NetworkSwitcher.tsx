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
            <div className="flex gap-2">
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
          If automatic network switching doesn't work, add the network manually
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm space-y-2">
          <p><strong>1.</strong> Open your wallet (MetaMask, etc.)</p>
          <p><strong>2.</strong> Go to Networks → Add Network</p>
          <p><strong>3.</strong> Add these details:</p>
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