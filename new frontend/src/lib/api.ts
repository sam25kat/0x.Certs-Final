const API_BASE_URL = 'http://localhost:8000';

export interface Event {
  id: number;
  event_name: string;
  description: string;
  event_code: string;
  event_date?: string;
  sponsors?: string;
  created_at: string;
  is_active: number;
  participants_count?: number;
  certificates_issued?: number;
}

export interface Participant {
  wallet_address: string;
  event_id: number;
  name: string;
  email: string;
  team_name?: string;
  poa_status: string;
  poa_token_id?: number;
  poa_minted_at?: string;
  poa_transferred_at?: string;
  poa_minted: boolean;
  certificate_status: string;
  certificate_token_id?: number;
  certificate_minted_at?: string;
  certificate_transferred_at?: string;
  certificate_minted: boolean;
  certificate_ipfs?: string;
}

export interface PlatformStats {
  total_events: number;
  total_participants: number;
  total_poas: number;
  total_certificates: number;
  active_events: number;
}

// API functions
export const api = {
  // Events
  getEvents: async (): Promise<Event[]> => {
    const response = await fetch(`${API_BASE_URL}/events`);
    if (!response.ok) throw new Error('Failed to fetch events');
    const data = await response.json();
    return data.events || [];
  },

  createEvent: async (eventData: { event_name: string; description: string; event_date: string; sponsors: string; organizer_wallet: string }): Promise<{ event_id: number; event_code: string; event_name: string; message: string }> => {
    const response = await fetch(`${API_BASE_URL}/create_event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventData),
    });
    if (!response.ok) throw new Error('Failed to create event');
    return response.json();
  },

  // Participants
  getParticipants: async (eventId?: string): Promise<Participant[]> => {
    const url = eventId ? `${API_BASE_URL}/participants/${eventId}` : `${API_BASE_URL}/participants`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch participants');
    const data = await response.json();
    return data.participants || [];
  },

  registerParticipant: async (participantData: {
    event_code: string;
    email: string;
    name: string;
    team_name?: string;
    wallet_address: string;
    telegram_username?: string;
  }): Promise<{ event_name: string; message: string }> => {
    const response = await fetch(`${API_BASE_URL}/register_participant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(participantData),
    });
    
    if (!response.ok) {
      let errorMessage = 'Failed to register participant';
      try {
        const errorData = await response.json();
        // Extract the detailed error message from the backend
        if (errorData.detail) {
          // Handle both simple string and structured error objects
          if (typeof errorData.detail === 'string') {
            errorMessage = errorData.detail;
          } else if (errorData.detail.message) {
            errorMessage = errorData.detail.message;
          } else {
            errorMessage = JSON.stringify(errorData.detail);
          }
        }
      } catch (parseError) {
        console.error('Failed to parse error response:', parseError);
      }
      throw new Error(errorMessage);
    }
    
    return response.json();
  },

  // Participant status
  getParticipantStatus: async (walletAddress: string): Promise<any> => {
    const response = await fetch(`${API_BASE_URL}/participant_status/${walletAddress}`);
    if (!response.ok) throw new Error('Failed to fetch participant status');
    return response.json();
  },

  // Telegram verification
  verifyTelegramMembership: async (telegramUsername: string): Promise<{ message: string }> => {
    const response = await fetch(`${API_BASE_URL}/verify-telegram-membership`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telegram_username: telegramUsername }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Telegram verification failed');
    }
    return response.json();
  },

  // Platform stats for admin
  getPlatformStats: async (): Promise<PlatformStats> => {
    const response = await fetch(`${API_BASE_URL}/admin/stats`);
    if (!response.ok) throw new Error('Failed to fetch platform stats');
    return response.json();
  },

  // NFT operations
  mintPoA: async (participantId: string): Promise<{ transaction_hash: string }> => {
    const response = await fetch(`${API_BASE_URL}/mint/poa/${participantId}`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Failed to mint PoA');
    return response.json();
  },

  mintCertificate: async (participantId: string): Promise<{ transaction_hash: string }> => {
    const response = await fetch(`${API_BASE_URL}/mint/certificate/${participantId}`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Failed to mint certificate');
    return response.json();
  },

  // Bulk operations
  bulkMintPoAs: async (eventId: string): Promise<{ success: number; failed: number }> => {
    const response = await fetch(`${API_BASE_URL}/bulk/mint-poas/${eventId}`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Failed to bulk mint PoAs');
    return response.json();
  },

  generateCertificates: async (eventId: string): Promise<{ success: number; failed: number }> => {
    const response = await fetch(`${API_BASE_URL}/bulk/generate-certificates/${eventId}`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Failed to generate certificates');
    return response.json();
  },

  batchTransferPoAs: async (eventId: string): Promise<{ success: number; failed: number }> => {
    const response = await fetch(`${API_BASE_URL}/bulk/batch-transfer-poas/${eventId}`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Failed to batch transfer PoAs');
    return response.json();
  },
};