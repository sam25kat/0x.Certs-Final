import React, { useState, useEffect } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';

interface ParticipantStatus {
  wallet_address: string;
  events: {
    [eventId: string]: {
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
    };
  };
}

interface EventData {
  event_id: number;
  event_name: string;
}

const HackerDashboard: React.FC = () => {
  const { address, isConnected } = useAccount();
  const [formData, setFormData] = useState({
    eventCode: '',
    email: '',
    name: '',
    teamName: ''
  });
  const [status, setStatus] = useState<{type: string, message: string} | null>(null);
  const [participantStatus, setParticipantStatus] = useState<ParticipantStatus | null>(null);
  const [eventData, setEventData] = useState<EventData | null>(null);

  const API_BASE = 'http://localhost:8000';

  // Load user NFT status when wallet connects
  useEffect(() => {
    if (address) {
      loadUserNFTStatus();
    } else {
      setParticipantStatus(null);
    }
  }, [address]);

  const showStatus = (type: string, message: string | any) => {
    // Ensure message is always a string to prevent React rendering errors
    const safeMessage = typeof message === 'string' ? message : 
                       message?.message ? String(message.message) :
                       JSON.stringify(message);
    setStatus({ type, message: safeMessage });
    setTimeout(() => setStatus(null), 10000);
  };

  const loadUserNFTStatus = async () => {
    if (!address) return;
    
    try {
      const response = await fetch(`${API_BASE}/participant_status/${address}`);
      
      if (response.ok) {
        const result = await response.json();
        setParticipantStatus(result);
      }
    } catch (error) {
      console.error('Error loading NFT status:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const validateEventCode = async (eventCode: string) => {
    // Event validation now happens in the registration endpoint
    // We'll just clear any previous event data and status
    setEventData(null);
    if (status?.type === 'error') {
      setStatus(null);
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isConnected || !address) {
      showStatus('error', 'Please connect your wallet first');
      return;
    }

    // Clear any previous validation status
    await validateEventCode(formData.eventCode);

    try {
      const response = await fetch(`${API_BASE}/register_participant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_code: formData.eventCode,
          email: formData.email,
          name: formData.name,
          team_name: formData.teamName,
          wallet_address: address
        })
      });

      const result = await response.json();

      if (response.ok) {
        showStatus('success', `✅ Registration successful for "${result.event_name}"!\n\n🎖️ Your PoA NFT will be minted and transferred by the organizer.\n\n📧 You'll receive your certificate NFT via email after the event ends.`);
        setFormData({ eventCode: '', email: '', name: '', teamName: '' });
        loadUserNFTStatus();
      } else {
        if (response.status === 400 && result.detail.includes('Already registered')) {
          showStatus('error', `⚠️ ${result.detail}\n\nIf you believe this is an error, please contact support or try with a different wallet address.`);
        } else if (response.status === 404) {
          showStatus('error', '❌ Event not found. Please check the event code and try again.');
        } else {
          showStatus('error', result.detail || 'Registration failed');
        }
      }
    } catch (error) {
      console.error('Registration error:', error);
      showStatus('error', 'Network error. Please try again.');
    }
  };

  const renderParticipantStatus = () => {
    if (!participantStatus || !participantStatus.events || Object.keys(participantStatus.events).length === 0) {
      return <p>No NFTs found for your wallet address.</p>;
    }

    return (
      <div style={{ display: 'grid', gap: '15px' }}>
        {Object.entries(participantStatus.events).map(([eventId, nftStatus]) => {
          const getPoAStatusDisplay = () => {
            switch(nftStatus.poa_status) {
              case 'registered':
                return { text: '📝 Registered - Waiting for mint', color: '#fff3cd' };
              case 'minted':
                return { text: '🏭 Minted - Waiting for transfer', color: '#d1ecf1' };
              case 'transferred':
                return { text: `✅ PoA NFT Received #${nftStatus.poa_token_id}`, color: '#d4edda' };
              default:
                return { text: '❓ Unknown status', color: '#f8d7da' };
            }
          };

          const getCertStatusDisplay = () => {
            switch(nftStatus.certificate_status) {
              case 'not_eligible':
                return { text: '⏳ Not eligible yet', color: '#f8f9fa' };
              case 'eligible':
                return { text: '🎯 Eligible - Waiting for generation', color: '#fff3cd' };
              case 'generated':
                return { text: '🏭 Generated - Waiting for mint', color: '#d1ecf1' };
              case 'minted':
                return { text: '🏭 Minted - Waiting for transfer', color: '#d1ecf1' };
              case 'transferred':
                return { text: `🏆 Certificate NFT Received #${nftStatus.certificate_token_id}`, color: '#d4edda' };
              default:
                return { text: '❓ Unknown status', color: '#f8d7da' };
            }
          };

          const poaStatus = getPoAStatusDisplay();
          const certStatus = getCertStatusDisplay();

          return (
            <div key={eventId} style={{
              background: 'white',
              border: '1px solid #e9ecef',
              borderRadius: '8px',
              padding: '15px'
            }}>
              <div style={{ marginBottom: '15px' }}>
                <strong>Event ID: {eventId}</strong>
              </div>
              <div style={{ display: 'grid', gap: '10px' }}>
                <div style={{ background: poaStatus.color, padding: '10px', borderRadius: '4px' }}>
                  <strong>🎖️ PoA Status:</strong> {poaStatus.text}
                  {nftStatus.poa_transferred_at && (
                    <>
                      <br />
                      <small>Transferred: {new Date(nftStatus.poa_transferred_at).toLocaleString()}</small>
                    </>
                  )}
                </div>
                <div style={{ background: certStatus.color, padding: '10px', borderRadius: '4px' }}>
                  <strong>🏆 Certificate Status:</strong> {certStatus.text}
                  {nftStatus.certificate_transferred_at && (
                    <>
                      <br />
                      <small>Transferred: {new Date(nftStatus.certificate_transferred_at).toLocaleString()}</small>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div style={{
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      minHeight: '100vh',
      padding: '20px'
    }}>
      <div style={{
        maxWidth: '800px',
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
            <h1 style={{ fontSize: '2rem', margin: '0 0 5px 0' }}>🎖️ Hacker Dashboard</h1>
            <p style={{ margin: 0, opacity: 0.9 }}>Connect wallet, register for events, and track your NFTs</p>
          </div>
          <a href="#home" style={{ 
            background: 'rgba(255,255,255,0.2)', 
            color: 'white', 
            padding: '10px 20px', 
            borderRadius: '8px', 
            textDecoration: 'none',
            border: 'none',
            cursor: 'pointer'
          }}>
            🏠 Home
          </a>
        </div>

        {/* Content */}
        <div style={{ padding: '30px' }}>
          {/* Wallet Connection */}
          <div style={{ marginBottom: '30px', textAlign: 'center' }}>
            <ConnectButton />
          </div>

          {/* Registration Form */}
          {isConnected && (
            <div style={{ marginBottom: '30px' }}>
              <h2>📝 Event Registration</h2>
              <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '20px' }}>
                <div>
                  <label htmlFor="eventCode">Event Code *</label>
                  <input
                    type="text"
                    id="eventCode"
                    name="eventCode"
                    value={formData.eventCode}
                    onChange={handleInputChange}
                    onBlur={(e) => e.target.value && validateEventCode(e.target.value)}
                    placeholder="Enter event code"
                    required
                    style={{ width: '100%', padding: '12px', border: '2px solid #e1e5e9', borderRadius: '8px' }}
                  />
                </div>
                <div>
                  <label htmlFor="email">Email Address *</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="your.email@example.com"
                    required
                    style={{ width: '100%', padding: '12px', border: '2px solid #e1e5e9', borderRadius: '8px' }}
                  />
                </div>
                <div>
                  <label htmlFor="name">Full Name *</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Enter your full name"
                    required
                    style={{ width: '100%', padding: '12px', border: '2px solid #e1e5e9', borderRadius: '8px' }}
                  />
                </div>
                <div>
                  <label htmlFor="teamName">Team Name (Optional)</label>
                  <input
                    type="text"
                    id="teamName"
                    name="teamName"
                    value={formData.teamName}
                    onChange={handleInputChange}
                    placeholder="Enter your team name"
                    style={{ width: '100%', padding: '12px', border: '2px solid #e1e5e9', borderRadius: '8px' }}
                  />
                </div>
                <button
                  type="submit"
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    border: 'none',
                    padding: '15px 30px',
                    borderRadius: '8px',
                    fontSize: '1.1rem',
                    cursor: 'pointer',
                    transition: 'transform 0.2s'
                  }}
                >
                  Register for Event
                </button>
              </form>
            </div>
          )}

          {/* Status Messages */}
          {status && (
            <div style={{
              padding: '15px',
              borderRadius: '8px',
              marginBottom: '20px',
              background: status.type === 'success' ? '#d4edda' : status.type === 'error' ? '#f8d7da' : '#fff3cd',
              color: status.type === 'success' ? '#155724' : status.type === 'error' ? '#721c24' : '#856404',
              whiteSpace: 'pre-line'
            }}>
              {status.message}
            </div>
          )}

          {/* NFT Status */}
          {isConnected && participantStatus && (
            <div>
              <h3>🎖️ My NFT Status</h3>
              {renderParticipantStatus()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HackerDashboard;