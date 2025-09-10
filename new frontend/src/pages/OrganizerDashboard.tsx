import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card-web3';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { api, type Event, type Participant } from '@/lib/api';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '@/config/wagmi';
import { Plus, Users, Award, Send, Download, BarChart3, Copy } from 'lucide-react';

export default function OrganizerDashboard() {
  console.log('🛠️ OrganizerDashboard: Component is rendering');
  const { address, isConnected } = useAccount();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [loadingStates, setLoadingStates] = useState<{[key: string]: boolean}>({});
  const [newEvent, setNewEvent] = useState({
    event_name: '',
    description: '',
    event_date: '',
    sponsors: '',
  });

  const { data: events = [], isLoading: eventsLoading, error: eventsError } = useQuery({
    queryKey: ['events'],
    queryFn: api.getEvents,
  });
  
  console.log('📅 Events data:', { events, eventsLoading, eventsError });

  const { data: participants = [], isLoading: participantsLoading, error: participantsError } = useQuery({
    queryKey: ['participants', selectedEventId],
    queryFn: () => selectedEventId ? api.getParticipants(selectedEventId) : Promise.resolve([]),
    enabled: !!selectedEventId,
  });
  
  console.log('👥 Participants data:', { participants, participantsLoading, participantsError, selectedEventId });

  const createEventMutation = useMutation({
    mutationFn: api.createEvent,
    onSuccess: (event) => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setShowCreateEvent(false);
      setNewEvent({ event_name: '', description: '', event_date: '', sponsors: '' });
      toast({
        title: "Event created successfully!",
        description: `Event code: ${event.event_code}`,
      });
    },
    onError: () => {
      toast({
        title: "Failed to create event",
        variant: "destructive",
      });
    },
  });

  // Bulk mint hooks for blockchain
  const { 
    data: bulkMintHash, 
    writeContract: bulkMintWrite, 
    isPending: isBulkMintLoading 
  } = useWriteContract();

  // Batch transfer hooks for blockchain
  const { 
    data: batchTransferHash, 
    writeContract: batchTransferWrite, 
    isPending: isBatchTransferLoading 
  } = useWriteContract();

  // Wait for bulk mint transaction
  const { 
    isLoading: isBulkMintWaiting, 
    data: bulkMintReceipt, 
    isSuccess: isBulkMintSuccess,
    error: bulkMintError 
  } = useWaitForTransactionReceipt({
    hash: bulkMintHash,
  });

  // Wait for batch transfer transaction  
  const { 
    isLoading: isBatchTransferWaiting, 
    data: batchTransferReceipt,
    isSuccess: isBatchTransferSuccess,
    error: batchTransferError
  } = useWaitForTransactionReceipt({
    hash: batchTransferHash,
  });

  const handleGenerateCertificates = async (eventId: string) => {
    try {
      setLoadingStates(prev => ({ ...prev, [`cert-${eventId}`]: true }));
      showStatus('loading', 'Generating certificates for all PoA holders...');
      
      const response = await fetch(`http://localhost:8000/bulk_generate_certificates/${eventId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.detail || 'Failed to generate certificates');
      }

      const summary = result.summary;
      
      // Check if there were any failures
      if (summary.failed_operations > 0) {
        const failureDetails = result.details?.filter((d: any) => !d.success) || [];
        const failureMessages = failureDetails.map((d: any) => `• ${d.participant}: ${d.step} failed - ${d.error}`).join('\\n');
        
        showStatus('warning', 
          `⚠️ Certificate generation completed with some issues:\\n\\n` +
          `📊 Summary:\\n` +
          `• Total participants: ${summary.total_participants}\\n` +
          `• Certificates generated: ${summary.successful_certificates}\\n` +
          `• Emails sent: ${summary.successful_emails}\\n` +
          `• Failed operations: ${summary.failed_operations}\\n\\n` +
          `❌ Failures:\\n${failureMessages}\\n\\n` +
          `ℹ️ This is likely due to blockchain connection issues. Participants still received certificates via email if email service is working.`
        );
      } else {
        showStatus('success', 
          `🎉 Certificate generation completed successfully!\\n\\n` +
          `📊 Summary:\\n` +
          `• Total participants: ${summary.total_participants}\\n` +
          `• Certificates generated: ${summary.successful_certificates}\\n` +
          `• Emails sent: ${summary.successful_emails}\\n` +
          `• Failed operations: ${summary.failed_operations}\\n\\n` +
          `✅ All certificate NFTs have been minted and emailed to participants!`
        );
      }
      
      // Refresh participant list to show updated status
      queryClient.invalidateQueries({ queryKey: ['participants', selectedEventId] });
      
    } catch (error) {
      console.error('Certificate generation error:', error);
      showStatus('error', `❌ Certificate generation failed: ${(error as Error)?.message || String(error)}`);
    } finally {
      setLoadingStates(prev => ({ ...prev, [`cert-${eventId}`]: false }));
    }
  };

  const showStatus = (type: string, message: string) => {
    const statusTypes: { [key: string]: any } = {
      'success': { title: 'Success', variant: undefined },
      'error': { title: 'Error', variant: 'destructive' as const },
      'loading': { title: 'Processing...', variant: undefined },
      'warning': { title: 'Warning', variant: undefined },
    };
    const statusConfig = statusTypes[type] || statusTypes['error'];
    toast({
      title: statusConfig.title,
      description: message,
      variant: statusConfig.variant,
    });
  };

  // Handle bulk mint success
  useEffect(() => {
    if (isBulkMintSuccess && bulkMintReceipt && selectedEventId) {
      handleBulkMintSuccess(bulkMintReceipt, selectedEventId);
    }
  }, [isBulkMintSuccess, bulkMintReceipt, selectedEventId]);

  // Handle bulk mint error
  useEffect(() => {
    if (bulkMintError) {
      showStatus('error', `Bulk mint transaction failed: ${bulkMintError?.message || String(bulkMintError)}`);
    }
  }, [bulkMintError]);

  // Handle batch transfer success
  useEffect(() => {
    if (isBatchTransferSuccess && batchTransferReceipt && selectedEventId) {
      handleBatchTransferSuccess(batchTransferReceipt, selectedEventId);
    }
  }, [isBatchTransferSuccess, batchTransferReceipt, selectedEventId]);

  // Handle batch transfer error
  useEffect(() => {
    if (batchTransferError) {
      showStatus('error', `Batch transfer transaction failed: ${batchTransferError?.message || String(batchTransferError)}`);
    }
  }, [batchTransferError]);

  const handleBulkMint = async (eventId: string) => {
    if (!isConnected || !address) {
      showStatus('error', 'Please connect your wallet first');
      return;
    }

    try {
      showStatus('loading', 'Preparing bulk mint...');
      
      const response = await fetch(`http://localhost:8000/bulk_mint_poa/${eventId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizer_wallet: address })
      });

      if (!response.ok) {
        const error = await response.json();
        showStatus('error', error.detail || 'Failed to prepare bulk mint');
        return;
      }

      const result = await response.json();
      
      if (result.recipients.length === 0) {
        showStatus('warning', 'No registered participants found for bulk minting.');
        return;
      }

      showStatus('loading', `Bulk minting ${result.participant_count} PoA NFTs... Please confirm in wallet`);

      // Store current event ID for success handler
      (window as any).currentBulkMintEventId = eventId;

      // Execute bulk mint
      bulkMintWrite({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'bulkMintPoA',
        args: [result.recipients, BigInt(eventId)]
      });

    } catch (error) {
      console.error('Bulk mint error:', error);
      showStatus('error', `Bulk mint failed: ${(error as Error)?.message || String(error)}`);
    }
  };

  const handleBulkMintSuccess = async (receipt: any, eventId: string) => {
    console.log('🎯 handleBulkMintSuccess called with eventId:', eventId, 'receipt:', receipt);
    
    try {
      // Extract token IDs from transaction receipt
      const tokenIds: number[] = [];
      
      console.log('📋 Receipt logs:', receipt.logs);
      
      if (receipt.logs) {
        for (const log of receipt.logs) {
          console.log('🔍 Processing log:', log);
          try {
            // Check if this is a PoAMinted event from our contract
            if (log.address?.toLowerCase() === CONTRACT_ADDRESS.toLowerCase()) {
              console.log('✅ Found contract log with topics:', log.topics?.length, 'data:', log.data);
              
              // PoAMinted event has signature and recipient in topics, tokenId and eventId in data
              if (log.topics && log.topics.length >= 2 && log.data && log.data.length > 2) {
                // Parse the data field which contains tokenId and eventId (both uint256)
                const dataHex = log.data.slice(2);
                if (dataHex.length >= 128) { // At least 2 * 32 bytes
                  const tokenIdHex = dataHex.slice(0, 64); // First 32 bytes
                  const tokenId = parseInt(tokenIdHex, 16);
                  console.log('💎 Extracted tokenId:', tokenId, 'from hex:', tokenIdHex);
                  if (tokenId >= 0 && !tokenIds.includes(tokenId)) {
                    tokenIds.push(tokenId);
                  }
                }
              }
            }
          } catch (e) {
            console.warn('Failed to parse log:', log, e);
          }
        }
      }

      console.log('🎖️ All extracted token IDs:', tokenIds);

      // Confirm with backend
      const confirmResponse = await fetch(`http://localhost:8000/confirm_bulk_mint_poa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: parseInt(eventId),
          tx_hash: receipt.transactionHash,
          token_ids: tokenIds
        })
      });

      if (!confirmResponse.ok) {
        const errorData = await confirmResponse.json();
        throw new Error(`Backend confirmation failed: ${errorData.detail || 'Unknown error'}`);
      }

      showStatus('success', `✅ Successfully bulk minted PoA NFTs!\n\nTX Hash: ${receipt.transactionHash}\nToken IDs: ${tokenIds.join(', ')}\n\nNow you can batch transfer them to participants.`);
      
      // Refresh participant list
      queryClient.invalidateQueries({ queryKey: ['participants', selectedEventId] });
      
    } catch (error) {
      console.error('Error confirming bulk mint:', error);
      showStatus('error', 'Bulk mint succeeded but confirmation failed');
    }
  };

  const handleBatchTransfer = async (eventId: string) => {
    if (!isConnected || !address) {
      showStatus('error', 'Please connect your wallet first');
      return;
    }

    try {
      showStatus('loading', 'Preparing batch transfer...');
      
      const response = await fetch(`http://localhost:8000/batch_transfer_poa/${eventId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizer_wallet: address })
      });

      if (!response.ok) {
        if (response.status === 404) {
          showStatus('error', `Event ID ${eventId} not found in database. This might happen if the event was created on blockchain but not properly saved to database. Please try refreshing the events list or contact support.`);
        } else {
          const error = await response.json();
          showStatus('error', error.detail || 'Failed to prepare batch transfer');
        }
        return;
      }

      const result = await response.json();
      
      if (result.recipients.length === 0) {
        showStatus('warning', 'No minted PoA NFTs ready for transfer.');
        return;
      }

      showStatus('loading', `Batch transferring ${result.transfer_count} PoA NFTs... Please confirm in wallet`);

      // Store current event ID for success handler
      (window as any).currentBatchTransferEventId = eventId;

      // Execute batch transfer
      batchTransferWrite({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'batchTransfer',
        args: [result.recipients, result.token_ids.map((id: number) => BigInt(id))]
      });

    } catch (error) {
      console.error('Batch transfer error:', error);
      showStatus('error', `Batch transfer failed: ${(error as Error)?.message || String(error)}`);
    }
  };

  const handleBatchTransferSuccess = async (receipt: any, eventId: string) => {
    try {
      // Confirm with backend
      await fetch(`http://localhost:8000/confirm_batch_transfer_poa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: parseInt(eventId),
          tx_hash: receipt.transactionHash
        })
      });

      showStatus('success', `✅ Successfully batch transferred PoA NFTs!\n\nTX Hash: ${receipt.transactionHash}\n\nParticipants now own their PoA NFTs!`);
      
      // Refresh participant list
      queryClient.invalidateQueries({ queryKey: ['participants', selectedEventId] });
      
    } catch (error) {
      console.error('Error confirming batch transfer:', error);
      showStatus('error', 'Batch transfer succeeded but confirmation failed');
    }
  };

  const handleCreateEvent = () => {
    if (!isConnected || !address) {
      toast({
        title: "Please connect your wallet first",
        variant: "destructive",
      });
      return;
    }

    if (!newEvent.event_name || !newEvent.description) {
      toast({
        title: "Please fill in required fields",
        variant: "destructive",
      });
      return;
    }

    createEventMutation.mutate({
      ...newEvent,
      organizer_wallet: address,
    });
  };

  const copyEventCode = async (eventCode: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent event card click
    try {
      await navigator.clipboard.writeText(eventCode);
      toast({
        title: "Event code copied!",
        description: `Event code ${eventCode} copied to clipboard`,
      });
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = eventCode;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      toast({
        title: "Event code copied!",
        description: `Event code ${eventCode} copied to clipboard`,
      });
    }
  };

  const EventCard = ({ event }: { event: Event }) => (
    <Card className="cursor-pointer transition-all duration-200 hover:border-primary/50" 
          onClick={() => setSelectedEventId(event.id.toString())}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{event.event_name}</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono">
              Code: {event.event_code}
            </Badge>
            <Badge variant="secondary" className="font-mono text-xs">
              ID: {event.id}
            </Badge>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 hover:bg-primary/10"
              onClick={(e) => copyEventCode(event.event_code, e)}
              title="Copy event code"
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
        </div>
        <CardDescription>{event.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <span>{event.participants_count || 0} participants</span>
          </div>
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4 text-primary" />
            <span>{event.certificates_issued || 0} certificates</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs">📅 {event.event_date}</span>
          </div>
        </div>
        {event.sponsors && (
          <div className="mt-3 pt-3 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Sponsored by <span className="font-medium">{event.sponsors}</span>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (eventsLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading events...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold gradient-text">Organizer Dashboard</h1>
            <p className="text-muted-foreground">Manage events and participants</p>
          </div>
          <Button 
            onClick={() => setShowCreateEvent(true)}
            variant="web3"
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Create Event
          </Button>
        </div>

        {showCreateEvent && (
          <Card>
            <CardHeader>
              <CardTitle>Create New Event</CardTitle>
              <CardDescription>Set up a new hackathon or event</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="event-name">Event Name *</Label>
                  <Input
                    id="event-name"
                    value={newEvent.event_name}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, event_name: e.target.value }))}
                    placeholder="Web3 Hackathon 2024"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="event-date">Event Date</Label>
                  <Input
                    type="date"
                    id="event-date"
                    value={newEvent.event_date}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, event_date: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sponsors">Sponsors (comma-separated)</Label>
                <Input
                  id="sponsors"
                  value={newEvent.sponsors}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, sponsors: e.target.value }))}
                  placeholder="Sponsor1, Sponsor2, Sponsor3"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="event-description">Description *</Label>
                <Textarea
                  id="event-description"
                  value={newEvent.description}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="A comprehensive Web3 hackathon focused on DeFi innovation..."
                  rows={3}
                />
              </div>


              <div className="flex gap-2">
                <Button 
                  onClick={handleCreateEvent}
                  disabled={createEventMutation.isPending}
                  variant="web3"
                >
                  {createEventMutation.isPending ? 'Creating...' : 'Create Event'}
                </Button>
                <Button 
                  onClick={() => setShowCreateEvent(false)}
                  variant="outline"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {selectedEventId ? (
          // Event Details View
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <Button 
                onClick={() => setSelectedEventId(null)}
                variant="outline"
              >
                ← Back to Events
              </Button>
              <div>
                <h2 className="text-2xl font-bold">
                  {events.find(e => e.id === selectedEventId)?.name}
                </h2>
                <p className="text-muted-foreground">
                  {participants.length} participants registered
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <BarChart3 className="h-8 w-8 text-primary" />
                    <div>
                      <p className="text-2xl font-bold">{participants.length}</p>
                      <p className="text-sm text-muted-foreground">Total Participants</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <Award className="h-8 w-8 text-primary" />
                    <div>
                      <p className="text-2xl font-bold">
                        {participants.filter(p => p.poa_status === 'minted' || p.poa_status === 'transferred').length}
                      </p>
                      <p className="text-sm text-muted-foreground">PoAs Minted</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <Send className="h-8 w-8 text-primary" />
                    <div>
                      <p className="text-2xl font-bold">
                        {participants.filter(p => p.certificate_status === 'completed' || p.certificate_status === 'transferred').length}
                      </p>
                      <p className="text-sm text-muted-foreground">Certificates Issued</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Bulk Actions</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleBulkMint(selectedEventId)}
                      disabled={isBulkMintLoading || isBulkMintWaiting}
                      variant="outline"
                      size="sm"
                    >
                      {(isBulkMintLoading || isBulkMintWaiting) ? 'Minting...' : 'Bulk Mint PoAs'}
                    </Button>
                    <Button
                      onClick={() => handleBatchTransfer(selectedEventId)}
                      disabled={isBatchTransferLoading || isBatchTransferWaiting}
                      variant="outline"
                      size="sm"
                    >
                      {(isBatchTransferLoading || isBatchTransferWaiting) ? 'Transferring...' : 'Batch Transfer PoAs'}
                    </Button>
                    <Button
                      onClick={() => handleGenerateCertificates(selectedEventId)}
                      disabled={loadingStates[`cert-${selectedEventId}`]}
                      variant="outline"
                      size="sm"
                    >
                      {loadingStates[`cert-${selectedEventId}`] ? 'Generating...' : 'Generate Certificates'}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <div className="grid grid-cols-6 gap-4 p-4 border-b border-border bg-muted/20 text-sm font-medium">
                    <span>Name</span>
                    <span>Email</span>
                    <span>Team</span>
                    <span>Wallet</span>
                    <span>PoA</span>
                    <span>Certificate</span>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {participantsLoading ? (
                      <div className="p-8 text-center text-muted-foreground">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                        Loading participants...
                      </div>
                    ) : participants.length === 0 ? (
                      <div className="p-8 text-center text-muted-foreground">
                        No participants found for this event.
                      </div>
                    ) : (
                      participants.map((participant, index) => (
                        <div key={`${participant.wallet_address}-${index}`} className="grid grid-cols-6 gap-4 p-4 border-b border-border last:border-b-0">
                          <span className="font-medium">{participant.name}</span>
                          <span className="text-muted-foreground">{participant.email}</span>
                          <span className="text-muted-foreground">{participant.team_name || '-'}</span>
                          <span 
                            className="text-muted-foreground font-mono text-xs"
                            title={participant.wallet_address}
                          >
                            {participant.wallet_address.substring(0, 6)}...{participant.wallet_address.slice(-4)}
                          </span>
                          <Badge 
                            variant={participant.poa_status === 'transferred' || participant.poa_status === 'minted' ? 'default' : 'secondary'} 
                            className="w-fit"
                          >
                            {participant.poa_status === 'transferred' ? `Transferred #${participant.poa_token_id}` : 
                             participant.poa_status === 'minted' ? `Minted #${participant.poa_token_id}` : 
                             participant.poa_status === 'registered' ? 'Registered' : 'Pending'}
                          </Badge>
                          <Badge 
                            variant={participant.certificate_status === 'transferred' || participant.certificate_status === 'completed' ? 'default' : 'secondary'} 
                            className="w-fit"
                          >
                            {participant.certificate_status === 'transferred' ? `Transferred #${participant.certificate_token_id}` : 
                             participant.certificate_status === 'completed' ? `Completed #${participant.certificate_token_id}` : 
                             participant.certificate_status === 'eligible' ? 'Eligible' : 'Not Eligible'}
                          </Badge>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          // Events Grid View
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Your Events</h2>
              <p className="text-muted-foreground">Click on an event to manage participants</p>
            </div>

            {events.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No events yet</h3>
                  <p className="text-muted-foreground mb-6">
                    Create your first event to start managing participants and certificates
                  </p>
                  <Button 
                    onClick={() => setShowCreateEvent(true)}
                    variant="web3"
                  >
                    Create Your First Event
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {events.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}