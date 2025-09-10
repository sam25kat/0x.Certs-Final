const API_BASE_URL = 'http://localhost:8000';

export interface Event {
  id: string;
  name: string;
  description: string;
  event_code: string;
  sponsor_name?: string;
  sponsor_logo?: string;
  created_at: string;
  participants_count: number;
  certificates_issued: number;
}

export interface Participant {
  id: string;
  name: string;
  email: string;
  team?: string;
  telegram?: string;
  wallet_address?: string;
  event_id: string;
  poa_minted: boolean;
  certificate_minted: boolean;
  telegram_verified: boolean;
  created_at: string;
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
    return response.json();
  },

  createEvent: async (eventData: Omit<Event, 'id' | 'created_at' | 'participants_count' | 'certificates_issued'>): Promise<Event> => {
    const response = await fetch(`${API_BASE_URL}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventData),
    });
    if (!response.ok) throw new Error('Failed to create event');
    return response.json();
  },

  // Participants
  getParticipants: async (eventId?: string): Promise<Participant[]> => {
    const url = eventId ? `${API_BASE_URL}/participants?event_id=${eventId}` : `${API_BASE_URL}/participants`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch participants');
    return response.json();
  },

  registerParticipant: async (participantData: Omit<Participant, 'id' | 'created_at' | 'poa_minted' | 'certificate_minted' | 'telegram_verified'>): Promise<Participant> => {
    const response = await fetch(`${API_BASE_URL}/participants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(participantData),
    });
    if (!response.ok) throw new Error('Failed to register participant');
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
};