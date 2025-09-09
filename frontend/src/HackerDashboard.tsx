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
    teamName: '',
    telegramUsername: ''
  });
  const [status, setStatus] = useState<{type: string, message: string} | null>(null);
  const [participantStatus, setParticipantStatus] = useState<ParticipantStatus | null>(null);
  const [eventData, setEventData] = useState<EventData | null>(null);
  const [telegramVerified, setTelegramVerified] = useState(false);
  const [telegramVerifying, setTelegramVerifying] = useState(false);

  const API_BASE = 'http://localhost:8003';

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
    const { name, value } = e.target;
    
    // Special handling for telegram username
    if (name === 'telegramUsername') {
      // Clean the input and reset verification status
      const cleanValue = value.replace(/[^a-zA-Z0-9_@]/g, '');
      setFormData({ ...formData, [name]: cleanValue });
      
      // Reset verification if user starts typing again
      if (telegramVerified && cleanValue !== formData.telegramUsername) {
        setTelegramVerified(false);
      }
    } else {
      setFormData({ ...formData, [name]: value });
    }
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

  const verifyTelegramMembership = async () => {
    const username = formData.telegramUsername.trim();
    
    // Enhanced input validation
    if (!username) {
      showStatus('error', '📱 Please enter your Telegram username to verify membership');
      return;
    }

    // Remove @ if user included it
    const cleanUsername = username.startsWith('@') ? username.slice(1) : username;
    
    // Basic username format validation
    if (!/^[a-zA-Z0-9_]{5,32}$/.test(cleanUsername)) {
      showStatus('error', '❌ Invalid Telegram username format. Username should be 5-32 characters and contain only letters, numbers, and underscores.');
      return;
    }

    setTelegramVerifying(true);
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

      const response = await fetch(`${API_BASE}/verify-telegram-membership`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegram_username: cleanUsername
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const result = await response.json();
      
      if (response.ok) {
        setTelegramVerified(true);
        // Update form data with clean username
        setFormData(prev => ({ ...prev, telegramUsername: cleanUsername }));
        showStatus('success', `🎉 Welcome to the community! @${cleanUsername} has been verified successfully. You can now register for events.`);
      } else {
        setTelegramVerified(false);
        
        // Enhanced error handling based on specific error types
        const errorMsg = result.detail || 'Verification failed';
        
        if (errorMsg.includes('not a member')) {
          showStatus('error', `❌ @${cleanUsername} is not a member of our Telegram community yet.\n\n👉 Please join our community first using the link below, then try verification again.`);
        } else if (errorMsg.includes('user not found')) {
          showStatus('error', `🔍 Telegram user @${cleanUsername} not found.\n\n💡 Please check your username spelling and make sure your Telegram account is public or try again with your exact username.`);
        } else if (errorMsg.includes('configuration error')) {
          showStatus('error', '⚙️ There\'s a temporary issue with our verification system. Please try again in a few moments or contact support.');
        } else if (errorMsg.includes('rate limit') || errorMsg.includes('too many requests')) {
          showStatus('error', '⏱️ Too many verification attempts. Please wait a moment before trying again.');
        } else {
          showStatus('error', `❌ Verification failed: ${errorMsg}\n\nPlease check your username and try again.`);
        }
      }
    } catch (error) {
      setTelegramVerified(false);
      console.error('Telegram verification error:', error);
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          showStatus('error', '⏰ Verification timed out. Please check your internet connection and try again.');
        } else if (error.message?.includes('Failed to fetch')) {
          showStatus('error', '🌐 Network connection error. Please check your internet connection and try again.');
        } else {
          showStatus('error', '❌ An unexpected error occurred during verification. Please try again or contact support if the issue persists.');
        }
      } else {
        showStatus('error', '❌ An unexpected error occurred during verification. Please try again or contact support if the issue persists.');
      }
    } finally {
      setTelegramVerifying(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isConnected || !address) {
      showStatus('error', 'Please connect your wallet first');
      return;
    }

    if (!telegramVerified) {
      showStatus('error', 'Please verify your Telegram community membership first');
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
          wallet_address: address,
          telegram_username: formData.telegramUsername.trim()
        })
      });

      const result = await response.json();

      if (response.ok) {
        showStatus('success', `✅ Registration successful for "${result.event_name}"!\n\n🎖️ Your PoA NFT will be minted and transferred by the organizer.\n\n📧 You'll receive your certificate NFT via email after the event ends.`);
        setFormData({ eventCode: '', email: '', name: '', teamName: '', telegramUsername: '' });
        setTelegramVerified(false);
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
    <>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
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
                <div style={{ 
                  background: telegramVerified ? '#f8fff8' : '#fff', 
                  border: telegramVerified ? '2px solid #28a745' : '2px solid #e1e5e9',
                  borderRadius: '12px',
                  padding: '16px',
                  transition: 'all 0.3s ease',
                  position: 'relative'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <label htmlFor="telegramUsername" style={{ 
                      fontWeight: '600',
                      color: telegramVerified ? '#28a745' : '#495057',
                      margin: 0
                    }}>
                      📱 Telegram Community Verification *
                    </label>
                    {telegramVerified && (
                      <span style={{
                        background: '#28a745',
                        color: 'white',
                        fontSize: '12px',
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontWeight: 'bold'
                      }}>
                        VERIFIED
                      </span>
                    )}
                  </div>
                  
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'stretch', marginBottom: '8px' }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                      <input
                        type="text"
                        id="telegramUsername"
                        name="telegramUsername"
                        value={formData.telegramUsername}
                        onChange={handleInputChange}
                        placeholder="Enter your Telegram username (without @)"
                        required
                        disabled={telegramVerified}
                        style={{ 
                          width: '100%', 
                          padding: '12px 16px', 
                          border: `2px solid ${telegramVerified ? '#28a745' : '#e1e5e9'}`, 
                          borderRadius: '8px',
                          background: telegramVerified ? '#f8fff8' : 'white',
                          fontSize: '14px',
                          transition: 'all 0.2s ease',
                          outline: 'none'
                        }}
                        onFocus={(e) => {
                          if (!telegramVerified) {
                            e.target.style.borderColor = '#667eea';
                            e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
                          }
                        }}
                        onBlur={(e) => {
                          if (!telegramVerified) {
                            e.target.style.borderColor = '#e1e5e9';
                            e.target.style.boxShadow = 'none';
                          }
                        }}
                      />
                      {formData.telegramUsername && !telegramVerified && (
                        <div style={{
                          position: 'absolute',
                          right: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          fontSize: '12px',
                          color: (() => {
                            const cleanUsername = formData.telegramUsername.startsWith('@') 
                              ? formData.telegramUsername.slice(1) 
                              : formData.telegramUsername;
                            const isValid = /^[a-zA-Z0-9_]{5,32}$/.test(cleanUsername);
                            return isValid ? '#28a745' : '#dc3545';
                          })()
                        }}>
                          @{formData.telegramUsername.startsWith('@') ? formData.telegramUsername.slice(1) : formData.telegramUsername}
                          {(() => {
                            const cleanUsername = formData.telegramUsername.startsWith('@') 
                              ? formData.telegramUsername.slice(1) 
                              : formData.telegramUsername;
                            const isValid = /^[a-zA-Z0-9_]{5,32}$/.test(cleanUsername);
                            return isValid ? ' ✓' : ' ✗';
                          })()}
                        </div>
                      )}
                    </div>
                    
                    {!telegramVerified ? (
                      <button
                        type="button"
                        onClick={verifyTelegramMembership}
                        disabled={telegramVerifying || !formData.telegramUsername.trim()}
                        style={{
                          background: telegramVerifying 
                            ? '#6c757d' 
                            : (!formData.telegramUsername.trim() 
                              ? '#dee2e6' 
                              : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'),
                          color: (!formData.telegramUsername.trim() && !telegramVerifying) ? '#6c757d' : 'white',
                          border: 'none',
                          padding: '12px 20px',
                          borderRadius: '8px',
                          cursor: (telegramVerifying || !formData.telegramUsername.trim()) ? 'not-allowed' : 'pointer',
                          whiteSpace: 'nowrap',
                          fontWeight: '600',
                          transition: 'all 0.2s ease',
                          transform: telegramVerifying ? 'scale(0.98)' : 'scale(1)',
                          minWidth: '120px'
                        }}
                        onMouseEnter={(e) => {
                          if (!telegramVerifying && formData.telegramUsername.trim()) {
                            const target = e.target as HTMLButtonElement;
                            target.style.transform = 'translateY(-2px)';
                            target.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!telegramVerifying) {
                            const target = e.target as HTMLButtonElement;
                            target.style.transform = 'translateY(0)';
                            target.style.boxShadow = 'none';
                          }
                        }}
                      >
                        {telegramVerifying ? (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ 
                              display: 'inline-block', 
                              width: '12px', 
                              height: '12px', 
                              border: '2px solid transparent',
                              borderTop: '2px solid white',
                              borderRadius: '50%',
                              animation: 'spin 1s linear infinite'
                            }}></span>
                            Verifying...
                          </span>
                        ) : '🔍 Verify'}
                      </button>
                    ) : (
                      <div style={{
                        background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
                        color: 'white',
                        padding: '12px 20px',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        whiteSpace: 'nowrap',
                        fontWeight: '600',
                        boxShadow: '0 2px 8px rgba(40, 167, 69, 0.3)'
                      }}>
                        <span style={{ fontSize: '16px' }}>✅</span>
                        Verified
                      </div>
                    )}
                  </div>
                  
                  {!telegramVerified ? (
                    <div style={{ 
                      padding: '16px', 
                      background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)', 
                      borderRadius: '12px',
                      border: '1px solid #dee2e6'
                    }}>
                      <div style={{ fontSize: '15px', color: '#495057', marginBottom: '12px', fontWeight: '600' }}>
                        🚀 <strong>New Verification Process:</strong>
                      </div>
                      
                      <div style={{ fontSize: '14px', color: '#6c757d', marginBottom: '16px' }}>
                        <div style={{ marginBottom: '8px' }}>
                          <strong>Step 1:</strong> Join our Telegram community
                        </div>
                        <div style={{ marginBottom: '8px' }}>
                          <strong>Step 2:</strong> Message <code style={{ 
                            background: '#e9ecef', 
                            padding: '2px 6px', 
                            borderRadius: '4px',
                            fontFamily: 'monospace',
                            color: '#495057'
                          }}>/0xday</code> in the community group
                        </div>
                        <div style={{ marginBottom: '8px' }}>
                          <strong>Step 3:</strong> Enter your username above and verify
                        </div>
                      </div>

                      <div style={{ 
                        display: 'flex', 
                        gap: '10px', 
                        flexWrap: 'wrap',
                        alignItems: 'center'
                      }}>
                        <a 
                          href="https://t.me/+reGkAz3_w6syOWJl"
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ 
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: 'linear-gradient(135deg, #0088cc 0%, #0099dd 100%)',
                            color: 'white',
                            padding: '10px 18px',
                            borderRadius: '25px',
                            textDecoration: 'none',
                            fontSize: '13px',
                            fontWeight: '600',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            const target = e.target as HTMLAnchorElement;
                            target.style.transform = 'translateY(-1px) scale(1.02)';
                            target.style.boxShadow = '0 4px 15px rgba(0, 136, 204, 0.4)';
                          }}
                          onMouseLeave={(e) => {
                            const target = e.target as HTMLAnchorElement;
                            target.style.transform = 'translateY(0) scale(1)';
                            target.style.boxShadow = 'none';
                          }}
                        >
                          <span>📱</span>
                          Join Community
                        </a>
                        
                        <div style={{ 
                          background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
                          color: 'white',
                          padding: '10px 18px',
                          borderRadius: '25px',
                          fontSize: '13px',
                          fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          <span>⚡</span>
                          Then type: /0xday
                        </div>
                      </div>
                      
                      <div style={{ 
                        marginTop: '12px',
                        fontSize: '12px', 
                        color: '#6c757d',
                        fontStyle: 'italic'
                      }}>
                        💡 <strong>Tip:</strong> You can message /0xday directly in the community group or privately to our bot @Certs0xDay_bot
                      </div>
                    </div>
                  ) : (
                    <div style={{ 
                      padding: '12px', 
                      background: 'linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%)', 
                      borderRadius: '8px',
                      border: '1px solid #c3e6cb'
                    }}>
                      <div style={{ fontSize: '14px', color: '#155724', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '16px' }}>🎉</span>
                        <strong>Great! You're verified as a community member.</strong>
                      </div>
                      <div style={{ fontSize: '13px', color: '#0f5132', marginTop: '4px' }}>
                        You can now proceed with event registration.
                      </div>
                    </div>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={!telegramVerified}
                  style={{
                    background: telegramVerified 
                      ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                      : 'linear-gradient(135deg, #6c757d 0%, #5a6268 100%)',
                    color: 'white',
                    border: 'none',
                    padding: '16px 32px',
                    borderRadius: '12px',
                    fontSize: '1.1rem',
                    fontWeight: '600',
                    cursor: telegramVerified ? 'pointer' : 'not-allowed',
                    transition: 'all 0.3s ease',
                    opacity: telegramVerified ? 1 : 0.6,
                    transform: telegramVerified ? 'scale(1)' : 'scale(0.98)',
                    boxShadow: telegramVerified 
                      ? '0 4px 15px rgba(102, 126, 234, 0.3)' 
                      : '0 2px 8px rgba(108, 117, 125, 0.2)',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                  onMouseEnter={(e) => {
                    if (telegramVerified) {
                      const target = e.target as HTMLButtonElement;
                      target.style.transform = 'translateY(-2px) scale(1.02)';
                      target.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.4)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (telegramVerified) {
                      const target = e.target as HTMLButtonElement;
                      target.style.transform = 'translateY(0) scale(1)';
                      target.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.3)';
                    }
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    {telegramVerified ? (
                      <>
                        <span style={{ fontSize: '1.2rem' }}>🚀</span>
                        Register for Event
                      </>
                    ) : (
                      <>
                        <span style={{ fontSize: '1rem' }}>🔒</span>
                        Complete Telegram Verification First
                      </>
                    )}
                  </span>
                  {!telegramVerified && (
                    <div style={{
                      position: 'absolute',
                      bottom: '0',
                      left: '0',
                      right: '0',
                      height: '3px',
                      background: 'linear-gradient(90deg, #667eea, #764ba2)',
                      transform: 'scaleX(0)',
                      transition: 'transform 0.3s ease'
                    }}></div>
                  )}
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
    </>
  );
};

export default HackerDashboard;