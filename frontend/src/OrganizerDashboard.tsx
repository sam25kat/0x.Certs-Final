import React, { useState, useEffect } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from './wagmi';

interface Event {
  id: number;
  event_name: string;
  event_code: string;
  event_date?: string;
  sponsors?: string;
  created_at: string;
  is_active: boolean;
}

interface Participant {
  wallet_address: string;
  name: string;
  email: string;
  team_name?: string;
  poa_status: string;
  poa_token_id?: number;
  poa_minted_at?: string;
  poa_transferred_at?: string;
  certificate_status: string;
  certificate_token_id?: number;
  certificate_minted_at?: string;
  certificate_transferred_at?: string;
  poa_minted: boolean;
  certificate_minted: boolean;
}

const OrganizerDashboard: React.FC = () => {
  console.log('🚀 OrganizerDashboard: Component is rendering');
  const { address, isConnected } = useAccount();
  console.log('💰 Wallet connection status:', { address, isConnected });
  const [events, setEvents] = useState<Event[]>([]);
  const [participants, setParticipants] = useState<{[key: number]: Participant[]}>({});
  const [expandedEvents, setExpandedEvents] = useState<{[key: number]: boolean}>({});
  const [status, setStatus] = useState<{type: string, message: string} | null>(null);
  const [loading, setLoading] = useState<{[key: string]: boolean}>({});
  const [showCreateForm, setShowCreateForm] = useState<boolean>(false);
  const [createEventForm, setCreateEventForm] = useState({
    eventName: '',
    eventDate: '',
    sponsors: '',
    description: ''
  });

  const API_BASE = 'http://localhost:8000';
  console.log('🔗 API_BASE configured:', API_BASE);

  // Bulk mint hook
  const { 
    data: bulkMintHash, 
    writeContract: bulkMintWrite, 
    isPending: isBulkMintLoading 
  } = useWriteContract();

  // Batch transfer hook  
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

  // Handle bulk mint success
  useEffect(() => {
    if (isBulkMintSuccess && bulkMintReceipt) {
      handleBulkMintSuccess(bulkMintReceipt);
    }
  }, [isBulkMintSuccess, bulkMintReceipt]);

  // Handle bulk mint error
  useEffect(() => {
    if (bulkMintError) {
      showStatus('error', `Bulk mint transaction failed: ${bulkMintError?.message || String(bulkMintError)}`);
    }
  }, [bulkMintError]);

  // Handle batch transfer success
  useEffect(() => {
    if (isBatchTransferSuccess && batchTransferReceipt) {
      handleBatchTransferSuccess(batchTransferReceipt);
    }
  }, [isBatchTransferSuccess, batchTransferReceipt]);

  // Handle batch transfer error
  useEffect(() => {
    if (batchTransferError) {
      showStatus('error', `Batch transfer transaction failed: ${batchTransferError?.message || String(batchTransferError)}`);
    }
  }, [batchTransferError]);

  useEffect(() => {
    if (isConnected) {
      loadEvents();
    }
  }, [isConnected]);

  const showStatus = (type: string, message: string | any) => {
    // Ensure message is always a string to prevent React rendering errors
    const safeMessage = typeof message === 'string' ? message : 
                       message?.message ? String(message.message) :
                       JSON.stringify(message);
    setStatus({ type, message: safeMessage });
    setTimeout(() => setStatus(null), 10000);
  };

  const loadEvents = async () => {
    try {
      console.log('📅 Loading events from:', `${API_BASE}/events`);
      const response = await fetch(`${API_BASE}/events`);
      console.log('📅 Events response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('📅 Events data received:', data);
        setEvents(data.events);
      } else {
        console.error('❌ Failed to load events, status:', response.status);
        showStatus('error', `Failed to load events (status: ${response.status}). Make sure the backend server is running on port 8000.`);
      }
    } catch (error) {
      console.error('❌ Error loading events:', error);
      showStatus('error', `Error loading events: ${error instanceof Error ? error.message : 'Unknown error'}. Make sure the backend server is running.`);
    }
  };

  const loadParticipants = async (eventId: number) => {
    try {
      setLoading(prev => ({...prev, [`participants-${eventId}`]: true}));
      
      // Add cache-busting parameter to ensure fresh data
      const response = await fetch(`${API_BASE}/participants/${eventId}?t=${Date.now()}`, {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setParticipants(prev => ({...prev, [eventId]: data.participants}));
      }
    } catch (error) {
      console.error('Error loading participants:', error);
    } finally {
      setLoading(prev => ({...prev, [`participants-${eventId}`]: false}));
    }
  };

  const toggleParticipants = async (eventId: number) => {
    const isExpanded = expandedEvents[eventId];
    
    if (!isExpanded) {
      await loadParticipants(eventId);
    }
    
    setExpandedEvents(prev => ({...prev, [eventId]: !isExpanded}));
  };

  const handleBulkMint = async (eventId: number) => {
    if (!isConnected || !address) {
      showStatus('error', 'Please connect your wallet first');
      return;
    }

    try {
      showStatus('loading', 'Preparing bulk mint...');
      
      const response = await fetch(`${API_BASE}/bulk_mint_poa/${eventId}`, {
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

  const handleBulkMintSuccess = async (receipt: any) => {
    const eventId = (window as any).currentBulkMintEventId;
    console.log('🎯 handleBulkMintSuccess called with eventId:', eventId, 'receipt:', receipt);
    
    try {
      // Extract token IDs from transaction receipt
      // PoAMinted event: recipient (indexed), tokenId (data), eventId (data)
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
      const confirmResponse = await fetch(`${API_BASE}/confirm_bulk_mint_poa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: eventId,
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
      await loadParticipants(eventId);
      
    } catch (error) {
      console.error('Error confirming bulk mint:', error);
      showStatus('error', 'Bulk mint succeeded but confirmation failed');
    }
  };

  const handleBatchTransfer = async (eventId: number) => {
    if (!isConnected || !address) {
      showStatus('error', 'Please connect your wallet first');
      return;
    }

    try {
      showStatus('loading', 'Preparing batch transfer...');
      
      const response = await fetch(`${API_BASE}/batch_transfer_poa/${eventId}`, {
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

  const handleBatchTransferSuccess = async (receipt: any) => {
    const eventId = (window as any).currentBatchTransferEventId;
    
    try {
      // Confirm with backend
      await fetch(`${API_BASE}/confirm_batch_transfer_poa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: eventId,
          tx_hash: receipt.transactionHash
        })
      });

      showStatus('success', `✅ Successfully batch transferred PoA NFTs!\n\nTX Hash: ${receipt.transactionHash}\n\nParticipants now own their PoA NFTs!`);
      
      // Refresh participant list
      await loadParticipants(eventId);
      
    } catch (error) {
      console.error('Error confirming batch transfer:', error);
      showStatus('error', 'Batch transfer succeeded but confirmation failed');
    }
  };

  const handleCreateEventInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCreateEventForm({
      ...createEventForm,
      [e.target.name]: e.target.value
    });
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isConnected || !address) {
      showStatus('error', 'Please connect your wallet first');
      return;
    }

    if (!createEventForm.eventName || !createEventForm.eventDate) {
      showStatus('error', 'Event name and date are required');
      return;
    }

    try {
      showStatus('loading', 'Creating event...');
      
      const response = await fetch(`${API_BASE}/create_event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_name: createEventForm.eventName,
          event_date: createEventForm.eventDate,
          sponsors: createEventForm.sponsors || null,
          description: createEventForm.description || null,
          organizer_wallet: address
        })
      });

      const result = await response.json();

      if (response.ok) {
        showStatus('success', `✅ Event "${result.event_name}" created successfully!\n\nEvent ID: ${result.event_id}\nEvent Code: ${result.event_code}`);
        
        // Reset form
        setCreateEventForm({
          eventName: '',
          eventDate: '',
          sponsors: '',
          description: ''
        });
        setShowCreateForm(false);
        
        // Refresh events list
        await loadEvents();
        
      } else {
        showStatus('error', result.detail || 'Failed to create event');
      }
      
    } catch (error) {
      console.error('Create event error:', error);
      showStatus('error', `Failed to create event: ${(error as Error)?.message || String(error)}`);
    }
  };

  const renderParticipants = (eventId: number) => {
    if (loading[`participants-${eventId}`]) {
      return <div>🔍 Loading participants...</div>;
    }

    const eventParticipants = participants[eventId] || [];
    
    if (eventParticipants.length === 0) {
      return <div>No participants found for this event.</div>;
    }

    // Calculate statistics
    const total = eventParticipants.length;
    const registered = eventParticipants.filter(p => p.poa_status === 'registered').length;
    const minted = eventParticipants.filter(p => p.poa_status === 'minted').length;
    const transferred = eventParticipants.filter(p => p.poa_status === 'transferred').length;
    const certificates = eventParticipants.filter(p => p.certificate_status === 'completed' || p.certificate_status === 'transferred').length;

    return (
      <div>
        {/* Statistics */}
        <div style={{
          marginBottom: '20px',
          padding: '15px',
          background: '#f8f9fa',
          borderRadius: '8px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '15px'
        }}>
          <div><strong>📊 Total:</strong> {total}</div>
          <div style={{color: '#ffc107'}}><strong>📝 Registered:</strong> {registered}</div>
          <div style={{color: '#17a2b8'}}><strong>🏭 Minted:</strong> {minted}</div>
          <div style={{color: '#28a745'}}><strong>✅ Transferred:</strong> {transferred}</div>
          <div><strong>🏆 Certificates:</strong> {certificates}</div>
        </div>

        {/* Participants Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8f9fa' }}>
                <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #dee2e6' }}>Name</th>
                <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #dee2e6' }}>Email</th>
                <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #dee2e6' }}>Team</th>
                <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #dee2e6' }}>Wallet</th>
                <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #dee2e6' }}>PoA Status</th>
                <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #dee2e6' }}>Cert Status</th>
              </tr>
            </thead>
            <tbody>
              {eventParticipants.map((participant, index) => {
                const getPoABadge = () => {
                  switch(participant.poa_status) {
                    case 'registered':
                      return <span style={{ background: '#fff3cd', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>📝 Registered</span>;
                    case 'minted':
                      return <span style={{ background: '#d1ecf1', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>🏭 Minted #{participant.poa_token_id}</span>;
                    case 'transferred':
                      return <span style={{ background: '#d4edda', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>✅ Transferred #{participant.poa_token_id}</span>;
                    default:
                      return <span style={{ background: '#f8d7da', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>❓ Unknown</span>;
                  }
                };

                const getCertBadge = () => {
                  switch(participant.certificate_status) {
                    case 'not_eligible':
                      return <span style={{ background: '#f8f9fa', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>⏳ Not Eligible</span>;
                    case 'eligible':
                      return <span style={{ background: '#fff3cd', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>🎯 Eligible</span>;
                    case 'completed':
                      return <span style={{ background: '#d1ecf1', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>✅ Completed #{participant.certificate_token_id}</span>;
                    case 'transferred':
                      return <span style={{ background: '#d4edda', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>🏆 Transferred #{participant.certificate_token_id}</span>;
                    default:
                      return <span style={{ background: '#f8d7da', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>❓ Unknown: {participant.certificate_status}</span>;
                  }
                };

                return (
                  <tr key={index}>
                    <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>{participant.name}</td>
                    <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>{participant.email}</td>
                    <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>{participant.team_name || 'N/A'}</td>
                    <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>
                      <span title={participant.wallet_address}>
                        {participant.wallet_address.substring(0, 6)}...{participant.wallet_address.slice(-4)}
                      </span>
                    </td>
                    <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>{getPoABadge()}</td>
                    <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>{getCertBadge()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Certificate Management Functions
  const handleGenerateCertificates = async (eventId: number) => {
    try {
      setLoading(prev => ({ ...prev, [`cert-${eventId}`]: true }));
      showStatus('loading', 'Generating certificates for all PoA holders...');
      
      const response = await fetch(`${API_BASE}/bulk_generate_certificates/${eventId}`, {
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
        const failureMessages = failureDetails.map((d: any) => `• ${d.participant}: ${d.step} failed - ${d.error}`).join('\n');
        
        showStatus('warning', 
          `⚠️ Certificate generation completed with some issues:\n\n` +
          `📊 Summary:\n` +
          `• Total participants: ${summary.total_participants}\n` +
          `• Certificates generated: ${summary.successful_certificates}\n` +
          `• Emails sent: ${summary.successful_emails}\n` +
          `• Failed operations: ${summary.failed_operations}\n\n` +
          `❌ Failures:\n${failureMessages}\n\n` +
          `ℹ️ This is likely due to blockchain connection issues. Participants still received certificates via email if email service is working.`
        );
      } else {
        showStatus('success', 
          `🎉 Certificate generation completed successfully!\n\n` +
          `📊 Summary:\n` +
          `• Total participants: ${summary.total_participants}\n` +
          `• Certificates generated: ${summary.successful_certificates}\n` +
          `• Emails sent: ${summary.successful_emails}\n` +
          `• Failed operations: ${summary.failed_operations}\n\n` +
          `✅ All certificate NFTs have been minted and emailed to participants!`
        );
      }
      
      // Refresh participant list to show updated status
      await loadParticipants(eventId);
      
    } catch (error) {
      console.error('Certificate generation error:', error);
      showStatus('error', `❌ Certificate generation failed: ${(error as Error)?.message || String(error)}`);
    } finally {
      setLoading(prev => ({ ...prev, [`cert-${eventId}`]: false }));
    }
  };

  const handleCheckCertificateStatus = async (eventId: number) => {
    try {
      setLoading(prev => ({ ...prev, [`status-${eventId}`]: true }));
      showStatus('loading', 'Checking certificate status...');
      
      const response = await fetch(`${API_BASE}/certificate_status/${eventId}`);
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.detail || 'Failed to check certificate status');
      }

      showStatus('info', 
        `📋 Certificate Status for "${result.event_name}":\n\n` +
        `• Total participants: ${result.total_participants}\n` +
        `• PoA holders: ${result.poa_holders}\n` +
        `• Certificates minted: ${result.certificates_minted}\n` +
        `• Certificates pending: ${result.certificates_pending}\n\n` +
        `${result.ready_for_bulk_generation ? '✅ Ready for bulk certificate generation!' : '⚠️ Not ready - participants need PoA tokens first'}`
      );
      
    } catch (error) {
      console.error('Certificate status error:', error);
      showStatus('error', `❌ Failed to check certificate status: ${(error as Error)?.message || String(error)}`);
    } finally {
      setLoading(prev => ({ ...prev, [`status-${eventId}`]: false }));
    }
  };

  return (
    <div style={{
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      minHeight: '100vh',
      padding: '20px'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        background: 'white',
        borderRadius: '15px',
        boxShadow: '0 15px 35px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          padding: '30px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h1 style={{ fontSize: '2rem', margin: '0 0 5px 0' }}>🛠️ Organizer Dashboard</h1>
            <p style={{ margin: 0, opacity: 0.9 }}>Manage events, participants, and mint NFTs</p>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <ConnectButton />
            <a href="#home" style={{ 
              background: 'rgba(255,255,255,0.2)', 
              color: 'white', 
              padding: '10px 20px', 
              borderRadius: '8px', 
              textDecoration: 'none',
              cursor: 'pointer'
            }}>
              🏠 Home
            </a>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '30px' }}>
          {/* Status Messages */}
          {status && (
            <div style={{
              padding: '15px',
              borderRadius: '8px',
              marginBottom: '20px',
              background: status.type === 'success' ? '#d4edda' : status.type === 'error' ? '#f8d7da' : status.type === 'loading' ? '#fff3cd' : '#d1ecf1',
              color: status.type === 'success' ? '#155724' : status.type === 'error' ? '#721c24' : status.type === 'loading' ? '#856404' : '#0c5460',
              whiteSpace: 'pre-line'
            }}>
              {status.type === 'loading' && <span>⏳ </span>}
              {status.message}
            </div>
          )}

          {/* Create Event Section */}
          {isConnected && (
            <div style={{ marginBottom: '30px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2>📅 Create New Event</h2>
                <button
                  onClick={() => setShowCreateForm(!showCreateForm)}
                  style={{
                    background: showCreateForm ? '#6c757d' : 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '0.9rem'
                  }}
                >
                  {showCreateForm ? 'Cancel' : '+ Create Event'}
                </button>
              </div>

              {showCreateForm && (
                <div style={{ 
                  background: '#f8f9fa', 
                  padding: '25px', 
                  borderRadius: '12px',
                  border: '1px solid #e9ecef'
                }}>
                  <form onSubmit={handleCreateEvent} style={{ display: 'grid', gap: '20px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                      <div>
                        <label htmlFor="eventName" style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>
                          Event Name *
                        </label>
                        <input
                          type="text"
                          id="eventName"
                          name="eventName"
                          value={createEventForm.eventName}
                          onChange={handleCreateEventInputChange}
                          placeholder="Enter hackathon name"
                          required
                          style={{
                            width: '100%',
                            padding: '12px',
                            border: '2px solid #e1e5e9',
                            borderRadius: '8px',
                            fontSize: '14px'
                          }}
                        />
                      </div>
                      <div>
                        <label htmlFor="eventDate" style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>
                          Event Date *
                        </label>
                        <input
                          type="date"
                          id="eventDate"
                          name="eventDate"
                          value={createEventForm.eventDate}
                          onChange={handleCreateEventInputChange}
                          required
                          style={{
                            width: '100%',
                            padding: '12px',
                            border: '2px solid #e1e5e9',
                            borderRadius: '8px',
                            fontSize: '14px'
                          }}
                        />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="sponsors" style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>
                        Sponsors (comma-separated)
                      </label>
                      <input
                        type="text"
                        id="sponsors"
                        name="sponsors"
                        value={createEventForm.sponsors}
                        onChange={handleCreateEventInputChange}
                        placeholder="Sponsor1, Sponsor2, Sponsor3"
                        style={{
                          width: '100%',
                          padding: '12px',
                          border: '2px solid #e1e5e9',
                          borderRadius: '8px',
                          fontSize: '14px'
                        }}
                      />
                    </div>
                    <div>
                      <label htmlFor="description" style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>
                        Description
                      </label>
                      <textarea
                        id="description"
                        name="description"
                        value={createEventForm.description}
                        onChange={(e) => setCreateEventForm({...createEventForm, description: e.target.value})}
                        placeholder="Describe your hackathon"
                        rows={3}
                        style={{
                          width: '100%',
                          padding: '12px',
                          border: '2px solid #e1e5e9',
                          borderRadius: '8px',
                          fontSize: '14px',
                          resize: 'vertical',
                          minHeight: '80px'
                        }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        type="submit"
                        style={{
                          background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
                          color: 'white',
                          border: 'none',
                          padding: '12px 24px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontSize: '1rem',
                          fontWeight: '600'
                        }}
                      >
                        ✨ Create Event
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowCreateForm(false)}
                        style={{
                          background: '#6c757d',
                          color: 'white',
                          border: 'none',
                          padding: '12px 24px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontSize: '1rem'
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* Events List */}
          {isConnected && (
            <div>
              <h2>📅 My Events</h2>
              {events.length === 0 ? (
                <p>No events created yet.</p>
              ) : (
                <div style={{ display: 'grid', gap: '20px' }}>
                  {events.map((event) => (
                    <div key={event.id} style={{
                      border: '1px solid #e9ecef',
                      borderRadius: '12px',
                      padding: '20px',
                      background: 'white'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '15px' }}>
                        <div>
                          <h3 style={{ margin: '0 0 5px 0' }}>{event.event_name}</h3>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '0', color: '#6c757d' }}>
                            <span>Code: {event.event_code} | ID: {event.id}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(event.event_code).then(() => {
                                  showStatus('success', `Event code ${event.event_code} copied to clipboard!`);
                                }).catch(() => {
                                  // Fallback for older browsers
                                  const textArea = document.createElement('textarea');
                                  textArea.value = event.event_code;
                                  document.body.appendChild(textArea);
                                  textArea.select();
                                  document.execCommand('copy');
                                  document.body.removeChild(textArea);
                                  showStatus('success', `Event code ${event.event_code} copied to clipboard!`);
                                });
                              }}
                              style={{
                                background: 'transparent',
                                border: '1px solid #6c757d',
                                borderRadius: '4px',
                                padding: '2px 6px',
                                fontSize: '0.7rem',
                                cursor: 'pointer',
                                color: '#6c757d',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                              title="Copy event code"
                            >
                              📋 Copy
                            </button>
                          </div>
                          {event.event_date && <p style={{ margin: '5px 0 0 0', color: '#6c757d' }}>Date: {event.event_date}</p>}
                        </div>
                        <span style={{
                          padding: '4px 12px',
                          borderRadius: '20px',
                          fontSize: '0.8rem',
                          background: event.is_active ? '#d4edda' : '#f8d7da',
                          color: event.is_active ? '#155724' : '#721c24'
                        }}>
                          {event.is_active ? '✅ Active' : '❌ Inactive'}
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => toggleParticipants(event.id)}
                          style={{
                            background: '#6c757d',
                            color: 'white',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: '6px',
                            cursor: 'pointer'
                          }}
                        >
                          {expandedEvents[event.id] ? 'Hide' : 'View'} Participants
                        </button>
                        <button
                          onClick={() => handleBulkMint(event.id)}
                          disabled={isBulkMintLoading || isBulkMintWaiting}
                          style={{
                            background: '#6c757d',
                            color: 'white',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            opacity: (isBulkMintLoading || isBulkMintWaiting) ? 0.6 : 1
                          }}
                        >
                          {(isBulkMintLoading || isBulkMintWaiting) ? '⏳ Minting...' : '🏭 Bulk Mint PoA'}
                        </button>
                        <button
                          onClick={() => handleBatchTransfer(event.id)}
                          disabled={isBatchTransferLoading || isBatchTransferWaiting}
                          style={{
                            background: '#ffc107',
                            color: '#212529',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            opacity: (isBatchTransferLoading || isBatchTransferWaiting) ? 0.6 : 1
                          }}
                        >
                          {(isBatchTransferLoading || isBatchTransferWaiting) ? '⏳ Transferring...' : '📤 Batch Transfer'}
                        </button>
                      </div>

                      {/* Participants Section */}
                      {expandedEvents[event.id] && (
                        <div style={{ marginTop: '20px', padding: '20px', background: '#f8f9fa', borderRadius: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                            <h4 style={{ margin: 0 }}>Participants</h4>
                            <div style={{ display: 'flex', gap: '10px' }}>
                              <button
                                onClick={() => handleBulkMint(event.id)}
                                disabled={isBulkMintLoading || isBulkMintWaiting}
                                style={{
                                  background: '#6c757d',
                                  color: 'white',
                                  border: 'none',
                                  padding: '6px 12px',
                                  borderRadius: '4px',
                                  fontSize: '0.8rem',
                                  cursor: 'pointer'
                                }}
                              >
                                🏭 Bulk Mint PoA
                              </button>
                              <button
                                onClick={() => handleBatchTransfer(event.id)}
                                disabled={isBatchTransferLoading || isBatchTransferWaiting}
                                style={{
                                  background: '#ffc107',
                                  color: '#212529',
                                  border: 'none',
                                  padding: '6px 12px',
                                  borderRadius: '4px',
                                  fontSize: '0.8rem',
                                  cursor: 'pointer'
                                }}
                              >
                                📤 Batch Transfer
                              </button>
                              <button
                                onClick={() => handleGenerateCertificates(event.id)}
                                disabled={loading[`cert-${event.id}`]}
                                style={{
                                  background: '#28a745',
                                  color: 'white',
                                  border: 'none',
                                  padding: '6px 12px',
                                  borderRadius: '4px',
                                  fontSize: '0.8rem',
                                  cursor: 'pointer',
                                  opacity: loading[`cert-${event.id}`] ? 0.6 : 1
                                }}
                              >
                                {loading[`cert-${event.id}`] ? '⏳ Generating...' : '📜 Generate Certificates'}
                              </button>
                              <button
                                onClick={() => handleCheckCertificateStatus(event.id)}
                                disabled={loading[`status-${event.id}`]}
                                style={{
                                  background: '#17a2b8',
                                  color: 'white',
                                  border: 'none',
                                  padding: '6px 12px',
                                  borderRadius: '4px',
                                  fontSize: '0.8rem',
                                  cursor: 'pointer',
                                  opacity: loading[`status-${event.id}`] ? 0.6 : 1
                                }}
                              >
                                {loading[`status-${event.id}`] ? '⏳ Checking...' : '📊 Certificate Status'}
                              </button>
                            </div>
                          </div>
                          {renderParticipants(event.id)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrganizerDashboard;