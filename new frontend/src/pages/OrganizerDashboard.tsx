import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card-web3';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { api, type Event, type Participant } from '@/lib/api';
import { API_BASE_URL } from '../lib/api';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '@/config/wagmi';
import { Plus, Users, Award, Send, Download, BarChart3, Copy, Mail, Trash2, Settings, Shield, Factory, Wallet, FileText, BarChart, Calendar, CalendarIcon } from 'lucide-react';
import { ProgressDialog } from '@/components/ui/progress-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface OrganizerSession {
  sessionToken: string;
  email: string;
  isRoot: boolean;
}

interface OrganizerEmail {
  email: string;
  is_root: boolean;
  created_at: string;
  is_active: boolean;
}

export default function OrganizerDashboard() {
  console.log('🛠️ OrganizerDashboard: Component is rendering');
  
  const { address, isConnected } = useAccount();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [session, setSession] = useState<OrganizerSession | null>(null);
  const [loginStep, setLoginStep] = useState<'email' | 'otp'>('email');
  const [loginEmail, setLoginEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Email management state
  const [showEmailManagement, setShowEmailManagement] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [organizerEmails, setOrganizerEmails] = useState<OrganizerEmail[]>([]);
  
  // Event management state (existing)
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [loadingStates, setLoadingStates] = useState<{[key: string]: boolean}>({});
  const [eventForm, setEventForm] = useState({
    event_name: '',
    description: '',
    event_date: '',
    sponsors: '',
    certificate_template: '',
  });
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  
  // Participant selection state for batch operations
  const [selectedParticipants, setSelectedParticipants] = useState<Set<number>>(new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number>(0);
  const [participants, setParticipants] = useState<{[key: number]: Participant[]}>({});

  // Check for existing session on component mount
  useEffect(() => {
    const storedSession = localStorage.getItem('organizerSession');
    if (storedSession) {
      try {
        const parsed = JSON.parse(storedSession);
        setSession(parsed);
        setIsAuthenticated(true);
      } catch (e) {
        localStorage.removeItem('organizerSession');
      }
    }
  }, []);

  // Load organizer emails when authenticated
  useEffect(() => {
    if (isAuthenticated && session) {
      loadOrganizerEmails();
    }
  }, [isAuthenticated, session]);

  // Clear selection when switching between events or participants change
  useEffect(() => {
    clearSelection();
    setLastSelectedIndex(0);
  }, [participants]);

  const handleSendOTP = async () => {
    if (!loginEmail.trim()) {
      toast({
        title: "Email required",
        description: "Please enter your organizer email address",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/organizer/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to send OTP');
      }

      toast({
        title: "OTP sent!",
        description: `Check your email (${loginEmail}) for the verification code`,
      });
      setLoginStep('otp');
    } catch (error: any) {
      toast({
        title: "Failed to send OTP",
        description: error.message || 'Please check your email and try again',
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otpCode.trim()) {
      toast({
        title: "OTP required",
        description: "Please enter the 6-digit code from your email",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/organizer/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: loginEmail.trim(), 
          otp_code: otpCode.trim() 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Invalid OTP code');
      }

      // Store session
      const sessionData: OrganizerSession = {
        sessionToken: data.session_token,
        email: data.email,
        isRoot: data.is_root,
      };
      
      localStorage.setItem('organizerSession', JSON.stringify(sessionData));
      setSession(sessionData);
      setIsAuthenticated(true);
      
      toast({
        title: "Welcome!",
        description: `Successfully logged in as ${data.email}`,
      });
    } catch (error: any) {
      toast({
        title: "Verification failed",
        description: error.message || 'Invalid or expired OTP code',
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('organizerSession');
    setSession(null);
    setIsAuthenticated(false);
    setLoginStep('email');
    setLoginEmail('');
    setOtpCode('');
    
    toast({
      title: "Logged out",
      description: "You have been successfully logged out",
    });
  };

  const loadOrganizerEmails = async () => {
    if (!session) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/organizer/emails?session_token=${session.sessionToken}`);
      const data = await response.json();
      
      if (response.ok) {
        setOrganizerEmails(data.emails);
      }
    } catch (error) {
      console.error('Failed to load organizer emails:', error);
    }
  };

  const handleAddEmail = async () => {
    if (!newEmail.trim() || !session) return;

    try {
      const response = await fetch(`${API_BASE_URL}/organizer/add-email?session_token=${session.sessionToken}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: newEmail.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to add email');
      }

      toast({
        title: "Email added",
        description: data.message,
      });
      
      setNewEmail('');
      loadOrganizerEmails();
    } catch (error: any) {
      toast({
        title: "Failed to add email",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleRemoveEmail = async (email: string) => {
    if (!session) return;

    try {
      const response = await fetch(`${API_BASE_URL}/organizer/remove-email?session_token=${session.sessionToken}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to remove email');
      }

      toast({
        title: "Email removed",
        description: data.message,
      });
      
      loadOrganizerEmails();
    } catch (error: any) {
      toast({
        title: "Failed to remove email",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Event management functions (full implementation)
  const { data: events = [], isLoading: eventsLoading, refetch: refetchEvents } = useQuery({
    queryKey: ['events'],
    queryFn: api.getEvents,
    enabled: isAuthenticated,
  });

  const [expandedEvents, setExpandedEvents] = useState<{[key: number]: boolean}>({});
  
  // Template management state
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Progress dialog state
  const [progressDialog, setProgressDialog] = useState({
    open: false,
    title: '',
    steps: [] as Array<{id: string, title: string, description?: string, status: 'pending' | 'loading' | 'completed' | 'error', error?: string}>,
    showSuccessAnimation: false
  });

  // Template queries
  const { data: templatesData } = useQuery({
    queryKey: ['templates'],
    queryFn: api.getTemplates,
  });

  const uploadTemplateMutation = useMutation({
    mutationFn: ({ file, sessionToken }: { file: File; sessionToken: string }) => 
      api.uploadTemplate(file, sessionToken),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      setSelectedFile(null);
      toast({
        title: "Template uploaded successfully!",
      });
    },
    onError: () => {
      toast({
        title: "Failed to upload template",
        variant: "destructive",
      });
    }
  });

  const createEventMutation = useMutation({
    mutationFn: api.createEvent,
    onSuccess: (event) => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setShowCreateEvent(false);
      setEventForm({ event_name: '', description: '', event_date: '', sponsors: '', certificate_template: '' });
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

  // Blockchain hooks for minting and transfers
  const { 
    data: bulkMintHash, 
    writeContract: bulkMintWrite, 
    isPending: isBulkMintLoading 
  } = useWriteContract();

  const { 
    data: batchTransferHash, 
    writeContract: batchTransferWrite, 
    isPending: isBatchTransferLoading 
  } = useWriteContract();

  // Wait for transactions
  const { 
    isLoading: isBulkMintWaiting, 
    data: bulkMintReceipt, 
    isSuccess: isBulkMintSuccess,
    error: bulkMintError 
  } = useWaitForTransactionReceipt({
    hash: bulkMintHash,
  });

  const { 
    isLoading: isBatchTransferWaiting, 
    data: batchTransferReceipt,
    isSuccess: isBatchTransferSuccess,
    error: batchTransferError
  } = useWaitForTransactionReceipt({
    hash: batchTransferHash,
  });

  // Handle transaction results
  useEffect(() => {
    if (isBulkMintSuccess && bulkMintReceipt) {
      handleBulkMintSuccess(bulkMintReceipt);
    }
  }, [isBulkMintSuccess, bulkMintReceipt]);

  useEffect(() => {
    if (bulkMintError) {
      toast({
        title: "Transaction failed",
        description: `Bulk mint failed: ${bulkMintError?.message || String(bulkMintError)}`,
        variant: "destructive",
      });
    }
  }, [bulkMintError]);

  useEffect(() => {
    if (isBatchTransferSuccess && batchTransferReceipt) {
      handleBatchTransferSuccess(batchTransferReceipt);
    }
  }, [isBatchTransferSuccess, batchTransferReceipt]);

  useEffect(() => {
    if (batchTransferError) {
      toast({
        title: "Transaction failed",
        description: `Batch transfer failed: ${batchTransferError?.message || String(batchTransferError)}`,
        variant: "destructive",
      });
    }
  }, [batchTransferError]);

  const handleCreateEvent = () => {
    if (!isConnected || !address) {
      toast({
        title: "Please connect your wallet first",
        variant: "destructive",
      });
      return;
    }

    if (!eventForm.event_name || !eventForm.description) {
      toast({
        title: "Please fill in required fields",
        variant: "destructive",
      });
      return;
    }

    // Use default template if no template is selected
    const templateToSend = eventForm.certificate_template || undefined;

    createEventMutation.mutate({
      ...eventForm,
      certificate_template: templateToSend,
      organizer_wallet: address,
    });
  };

  // Load participants for a specific event
  const loadParticipants = async (eventId: number) => {
    if (!session?.sessionToken) {
      toast({
        title: "Session expired",
        description: "Please log in again",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setLoadingStates(prev => ({...prev, [`participants-${eventId}`]: true}));
      
      const response = await fetch(`${API_BASE_URL}/participants/${eventId}?session_token=${session.sessionToken}&t=${Date.now()}`, {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          toast({
            title: "Session expired",
            description: "Please log in again",
            variant: "destructive",
          });
          handleLogout();
          return;
        }
        throw new Error(`Failed to load participants: ${response.status}`);
      }
      
      const data = await response.json();
      setParticipants(prev => ({...prev, [eventId]: data.participants}));
    } catch (error) {
      console.error('Error loading participants:', error);
      toast({
        title: "Failed to load participants",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive",
      });
    } finally {
      setLoadingStates(prev => ({...prev, [`participants-${eventId}`]: false}));
    }
  };

  // Toggle participants view
  const toggleParticipants = async (eventId: number) => {
    const isExpanded = expandedEvents[eventId];
    
    if (!isExpanded) {
      await loadParticipants(eventId);
    }
    
    setExpandedEvents(prev => ({...prev, [eventId]: !isExpanded}));
  };

  // Participant selection helper functions
  const handleParticipantToggle = (participantId: number) => {
    setSelectedParticipants(prev => {
      const newSet = new Set(prev);
      if (newSet.has(participantId)) {
        newSet.delete(participantId);
      } else {
        if (newSet.size >= 25) {
          toast({
            title: "Selection Limit Reached",
            description: "You can select maximum 25 participants at a time to avoid RPC errors.",
            variant: "destructive"
          });
          return prev;
        }
        newSet.add(participantId);
      }
      return newSet;
    });
  };

  const handleSelectNext25 = (eventId: number) => {
    const eventParticipants = participants[eventId] || [];
    const remaining = eventParticipants.slice(lastSelectedIndex);
    const next25 = remaining.slice(0, 25);
    
    setSelectedParticipants(new Set(next25.map(p => p.id)));
    setLastSelectedIndex(prev => prev + next25.length);
    
    if (next25.length < 25) {
      // Reset for next round
      setLastSelectedIndex(0);
      toast({
        title: "Selection Complete",
        description: `Selected ${next25.length} participants. Reset to beginning for next batch.`,
      });
    } else {
      toast({
        title: "Next 25 Selected",
        description: `Selected ${next25.length} participants for batch processing.`,
      });
    }
  };

  const clearSelection = () => {
    setSelectedParticipants(new Set());
  };

  const getSelectedParticipants = (eventId: number) => {
    const eventParticipants = participants[eventId] || [];
    return eventParticipants.filter(p => selectedParticipants.has(p.id));
  };

  // Handle bulk mint PoA (updated for selected participants)
  const handleBulkMint = async (eventId: number) => {
    if (!isConnected || !address) {
      toast({
        title: "Please connect your wallet first",
        variant: "destructive",
      });
      return;
    }

    if (!session?.sessionToken) {
      toast({
        title: "Session expired",
        description: "Please log in again",
        variant: "destructive",
      });
      return;
    }

    // Check if participants are selected
    const selectedParticipantIds = Array.from(selectedParticipants);
    if (selectedParticipantIds.length === 0) {
      toast({
        title: "No participants selected",
        description: "Please select up to 25 participants to mint PoA NFTs for batch processing.",
        variant: "destructive",
      });
      return;
    }

    // Initialize progress dialog
    setProgressDialog({
      open: true,
      title: `Bulk Minting PoA NFTs (${selectedParticipantIds.length} selected)`,
      steps: [
        { id: 'prepare', title: 'Preparing bulk mint', status: 'loading' },
        { id: 'validate', title: 'Validating participants', status: 'pending' },
        { id: 'blockchain', title: 'Executing blockchain transaction', status: 'pending' },
        { id: 'confirm', title: 'Confirming with backend', status: 'pending' }
      ],
      showSuccessAnimation: false
    });

    try {
      setLoadingStates(prev => ({...prev, [`mint-${eventId}`]: true}));
      
      // Step 1: Prepare - Send selected participant IDs
      const response = await fetch(`${API_BASE_URL}/bulk_mint_poa/${eventId}?session_token=${session.sessionToken}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          organizer_wallet: address,
          participant_ids: selectedParticipantIds 
        })
      });

      if (!response.ok) {
        const error = await response.json();
        setProgressDialog(prev => ({
          ...prev,
          steps: prev.steps.map(step => 
            step.id === 'prepare' 
              ? { ...step, status: 'error', error: error.detail || 'Failed to prepare bulk mint' }
              : step
          )
        }));
        return;
      }

      // Step 1 complete
      setProgressDialog(prev => ({
        ...prev,
        steps: prev.steps.map(step => 
          step.id === 'prepare' 
            ? { ...step, status: 'completed' }
            : step.id === 'validate'
            ? { ...step, status: 'loading' }
            : step
        )
      }));

      const result = await response.json();
      
      if (result.recipients.length === 0) {
        setProgressDialog(prev => ({
          ...prev,
          steps: prev.steps.map(step => 
            step.id === 'validate' 
              ? { ...step, status: 'error', error: 'No registered participants found for bulk minting' }
              : step
          )
        }));
        return;
      }

      // Step 2 complete
      setProgressDialog(prev => ({
        ...prev,
        steps: prev.steps.map(step => 
          step.id === 'validate' 
            ? { ...step, status: 'completed', description: `Found ${result.participant_count} participants` }
            : step.id === 'blockchain'
            ? { ...step, status: 'loading', description: 'Please confirm transaction in wallet' }
            : step
        )
      }));

      // Store current event ID and participant IDs for success handler
      (window as any).currentBulkMintEventId = eventId;
      (window as any).currentBulkMintParticipantIds = selectedParticipantIds;

      // Execute bulk mint
      bulkMintWrite({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'bulkMintPoA',
        args: [result.recipients, BigInt(eventId), result.ipfs_hash]
      });

    } catch (error) {
      console.error('Bulk mint error:', error);
      setProgressDialog(prev => ({
        ...prev,
        steps: prev.steps.map(step => 
          step.status === 'loading' 
            ? { ...step, status: 'error', error: error instanceof Error ? error.message : 'Unknown error' }
            : step
        )
      }));
    } finally {
      setLoadingStates(prev => ({...prev, [`mint-${eventId}`]: false}));
    }
  };

  // Handle bulk mint success
  const handleBulkMintSuccess = async (receipt: any) => {
    const eventId = (window as any).currentBulkMintEventId;
    const participantIds = (window as any).currentBulkMintParticipantIds;
    
    // Update progress - blockchain step completed
    setProgressDialog(prev => ({
      ...prev,
      steps: prev.steps.map(step => 
        step.id === 'blockchain' 
          ? { ...step, status: 'completed', description: `Transaction confirmed: ${receipt.transactionHash.slice(0, 10)}...` }
          : step.id === 'confirm'
          ? { ...step, status: 'loading' }
          : step
      )
    }));
    
    try {
      // Extract token IDs from transaction receipt
      const tokenIds: number[] = [];
      
      if (receipt.logs) {
        for (const log of receipt.logs) {
          try {
            if (log.address?.toLowerCase() === CONTRACT_ADDRESS.toLowerCase()) {
              if (log.topics && log.topics.length >= 2 && log.data && log.data.length > 2) {
                const dataHex = log.data.slice(2);
                if (dataHex.length >= 128) {
                  const tokenIdHex = dataHex.slice(0, 64);
                  const tokenId = parseInt(tokenIdHex, 16);
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

      // Confirm with backend
      const confirmResponse = await fetch(`${API_BASE_URL}/confirm_bulk_mint_poa?session_token=${session?.sessionToken}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: eventId,
          tx_hash: receipt.transactionHash,
          token_ids: tokenIds,
          participant_ids: participantIds
        })
      });

      if (!confirmResponse.ok) {
        const errorData = await confirmResponse.json();
        setProgressDialog(prev => ({
          ...prev,
          steps: prev.steps.map(step => 
            step.id === 'confirm' 
              ? { ...step, status: 'error', error: `Backend confirmation failed: ${errorData.detail || 'Unknown error'}` }
              : step
          )
        }));
        return;
      }

      // All steps completed
      setProgressDialog(prev => ({
        ...prev,
        steps: prev.steps.map(step => 
          step.id === 'confirm' 
            ? { ...step, status: 'completed', description: `${tokenIds.length} PoA NFTs minted successfully` }
            : step
        ),
        showSuccessAnimation: true
      }));

      toast({
        title: "Successfully bulk minted PoA NFTs!",
        description: `TX Hash: ${receipt.transactionHash}\nToken IDs: ${tokenIds.join(', ')}\n\nNow you can batch transfer them to participants.`,
      });
      
      // Clear selection and refresh participant list
      clearSelection();
      await loadParticipants(eventId);
      
    } catch (error) {
      console.error('Error confirming bulk mint:', error);
      setProgressDialog(prev => ({
        ...prev,
        steps: prev.steps.map(step => 
          step.id === 'confirm' 
            ? { ...step, status: 'error', error: error instanceof Error ? error.message : 'Unknown error' }
            : step
        )
      }));
    }
  };

  // Handle batch transfer (updated for selected participants)
  const handleBatchTransfer = async (eventId: number) => {
    if (!isConnected || !address) {
      toast({
        title: "Please connect your wallet first",
        variant: "destructive",
      });
      return;
    }

    // Check if participants are selected
    const selectedParticipantIds = Array.from(selectedParticipants);
    if (selectedParticipantIds.length === 0) {
      toast({
        title: "No participants selected",
        description: "Please select up to 25 participants to transfer PoA NFTs for batch processing.",
        variant: "destructive",
      });
      return;
    }

    if (!session?.sessionToken) {
      toast({
        title: "Session expired",
        description: "Please log in again",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoadingStates(prev => ({...prev, [`transfer-${eventId}`]: true}));
      
      toast({
        title: "Preparing batch transfer...",
        description: "This may take a few moments",
      });
      
      const response = await fetch(`${API_BASE_URL}/batch_transfer_poa/${eventId}?session_token=${session.sessionToken}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          organizer_wallet: address,
          participant_ids: selectedParticipantIds
        })
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`Event ID ${eventId} not found in database`);
        }
        const error = await response.json();
        throw new Error(error.detail || 'Failed to prepare batch transfer');
      }

      const result = await response.json();
      
      if (result.recipients.length === 0) {
        toast({
          title: "No NFTs to transfer",
          description: "No minted PoA NFTs ready for transfer",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Confirm transaction",
        description: `Batch transferring ${result.transfer_count} PoA NFTs... Please confirm in wallet`,
      });

      // Store current event ID for success handler
      (window as any).currentBatchTransferEventId = eventId;
      (window as any).currentBatchTransferParticipantIds = selectedParticipantIds;

      // Execute batch transfer
      batchTransferWrite({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'batchTransfer',
        args: [result.recipients, result.token_ids.map((id: number) => BigInt(id))]
      });

    } catch (error) {
      console.error('Batch transfer error:', error);
      toast({
        title: "Batch transfer failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive",
      });
    } finally {
      setLoadingStates(prev => ({...prev, [`transfer-${eventId}`]: false}));
    }
  };

  // Handle batch transfer success
  const handleBatchTransferSuccess = async (receipt: any) => {
    const eventId = (window as any).currentBatchTransferEventId;
    const participantIds = (window as any).currentBatchTransferParticipantIds;
    
    try {
      // Confirm with backend
      await fetch(`${API_BASE_URL}/confirm_batch_transfer_poa?session_token=${session?.sessionToken}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: eventId,
          tx_hash: receipt.transactionHash,
          participant_ids: participantIds
        })
      });

      toast({
        title: "Successfully batch transferred PoA NFTs!",
        description: `TX Hash: ${receipt.transactionHash}\n\nParticipants now own their PoA NFTs!`,
      });
      
      // Clear selection and refresh participant list
      clearSelection();
      await loadParticipants(eventId);
      
    } catch (error) {
      console.error('Error confirming batch transfer:', error);
      toast({
        title: "Confirmation failed",
        description: "Batch transfer succeeded but confirmation failed",
        variant: "destructive",
      });
    }
  };

  // Generate certificates for selected PoA holders
  const handleGenerateCertificates = async (eventId: number) => {
    // Check if participants are selected
    const selectedParticipantIds = Array.from(selectedParticipants);
    if (selectedParticipantIds.length === 0) {
      toast({
        title: "No participants selected",
        description: "Please select up to 25 participants to generate certificates for batch processing.",
        variant: "destructive",
      });
      return;
    }
    if (!session?.sessionToken) {
      toast({
        title: "Session expired",
        description: "Please log in again",
        variant: "destructive",
      });
      return;
    }

    // Initialize progress dialog
    setProgressDialog({
      open: true,
      title: "Generating Certificates",
      steps: [
        { id: 'validate', title: 'Validating PoA holders', status: 'loading' },
        { id: 'generate', title: 'Generating certificate images', status: 'pending' },
        { id: 'upload', title: 'Uploading to IPFS', status: 'pending' },
        { id: 'email', title: 'Sending email notifications', status: 'pending' }
      ],
      showSuccessAnimation: false
    });
    
    try {
      setLoadingStates(prev => ({ ...prev, [`cert-${eventId}`]: true }));
      
      // Step 1: Validate PoA holders
      setTimeout(() => {
        setProgressDialog(prev => ({
          ...prev,
          steps: prev.steps.map(step => 
            step.id === 'validate' 
              ? { ...step, status: 'completed', description: 'PoA holders validated' }
              : step.id === 'generate'
              ? { ...step, status: 'loading' }
              : step
          )
        }));
      }, 500);

      // Step 2: Generate certificates
      setTimeout(() => {
        setProgressDialog(prev => ({
          ...prev,
          steps: prev.steps.map(step => 
            step.id === 'generate' 
              ? { ...step, status: 'completed', description: 'Certificate images generated' }
              : step.id === 'upload'
              ? { ...step, status: 'loading' }
              : step
          )
        }));
      }, 1500);

      // Step 3: Upload to IPFS
      setTimeout(() => {
        setProgressDialog(prev => ({
          ...prev,
          steps: prev.steps.map(step => 
            step.id === 'upload' 
              ? { ...step, status: 'completed', description: 'Certificates uploaded to IPFS' }
              : step.id === 'email'
              ? { ...step, status: 'loading' }
              : step
          )
        }));
      }, 2500);
      
      const response = await fetch(`${API_BASE_URL}/bulk_generate_certificates/${eventId}?session_token=${session.sessionToken}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          participant_ids: selectedParticipantIds
        })
      });

      const result = await response.json();
      
      if (!response.ok) {
        setProgressDialog(prev => ({
          ...prev,
          steps: prev.steps.map(step => 
            step.status === 'loading' 
              ? { ...step, status: 'error', error: result.detail || 'Failed to generate certificates' }
              : step
          )
        }));
        return;
      }

      const summary = result.summary;
      
      // Final step: Email notifications
      setProgressDialog(prev => ({
        ...prev,
        steps: prev.steps.map(step => 
          step.id === 'email' 
            ? { 
                ...step, 
                status: summary.successful_emails > 0 ? 'completed' : (summary.failed_operations > 0 ? 'error' : 'completed'), 
                description: `${summary.successful_emails} emails sent successfully` 
              }
            : step
        ),
        showSuccessAnimation: summary.failed_operations === 0
      }));
      
      if (summary.failed_operations > 0) {
        toast({
          title: "Certificate generation completed with issues",
          description: `Total: ${summary.total_participants}, Generated: ${summary.successful_certificates}, Emailed: ${summary.successful_emails}, Failed: ${summary.failed_operations}`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Certificate generation completed!",
          description: `Total: ${summary.total_participants}, Generated: ${summary.successful_certificates}, Emailed: ${summary.successful_emails}`,
        });
      }
      
      // Clear selection and refresh participant list
      clearSelection();
      await loadParticipants(eventId);
      
    } catch (error) {
      console.error('Certificate generation error:', error);
      setProgressDialog(prev => ({
        ...prev,
        steps: prev.steps.map(step => 
          step.status === 'loading' 
            ? { ...step, status: 'error', error: error instanceof Error ? error.message : 'Unknown error' }
            : step
        )
      }));
    } finally {
      setLoadingStates(prev => ({ ...prev, [`cert-${eventId}`]: false }));
    }
  };

  // Check certificate status
  const handleCheckCertificateStatus = async (eventId: number) => {
    if (!session?.sessionToken) {
      toast({
        title: "Session expired",
        description: "Please log in again",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setLoadingStates(prev => ({ ...prev, [`status-${eventId}`]: true }));
      
      const response = await fetch(`${API_BASE_URL}/certificate_status/${eventId}?session_token=${session.sessionToken}`);
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.detail || 'Failed to check certificate status');
      }

      toast({
        title: `Certificate Status - "${result.event_name}"`,
        description: `Total participants: ${result.total_participants}\nPoA holders: ${result.poa_holders}\nCertificates minted: ${result.certificates_minted}\nCertificates pending: ${result.certificates_pending}\n\n${result.ready_for_bulk_generation ? '✅ Ready for bulk generation!' : '⚠️ Not ready - participants need PoA tokens first'}`,
      });
      
    } catch (error) {
      console.error('Certificate status error:', error);
      toast({
        title: "Failed to check certificate status",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive",
      });
    } finally {
      setLoadingStates(prev => ({ ...prev, [`status-${eventId}`]: false }));
    }
  };

  // Toggle event active status
  const handleToggleEventStatus = async (eventId: number, currentStatus: boolean) => {
    if (!session?.sessionToken) {
      toast({
        title: "Session expired",
        description: "Please log in again",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setLoadingStates(prev => ({ ...prev, [`toggle-${eventId}`]: true }));
      
      const response = await fetch(`${API_BASE_URL}/toggle_event_status/${eventId}?session_token=${session.sessionToken}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentStatus })
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.detail || 'Failed to toggle event status');
      }

      toast({
        title: "Event status updated",
        description: `Event is now ${!currentStatus ? 'active' : 'inactive'}`,
      });
      
      // Refresh events list
      refetchEvents();
      
    } catch (error) {
      console.error('Toggle event status error:', error);
      toast({
        title: "Failed to update event status",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive",
      });
    } finally {
      setLoadingStates(prev => ({ ...prev, [`toggle-${eventId}`]: false }));
    }
  };

  // Copy event code to clipboard
  const copyEventCode = async (eventCode: string) => {
    try {
      await navigator.clipboard.writeText(eventCode);
      toast({
        title: "Copied!",
        description: `Event code ${eventCode} copied to clipboard`,
      });
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = eventCode;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      toast({
        title: "Copied!",
        description: `Event code ${eventCode} copied to clipboard`,
      });
    }
  };

  // Render participant details
  const renderParticipants = (eventId: number) => {
    if (loadingStates[`participants-${eventId}`]) {
      return (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-3"></div>
          Loading participants...
        </div>
      );
    }

    const eventParticipants = participants[eventId] || [];
    
    if (eventParticipants.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          No participants found for this event.
        </div>
      );
    }

    // Calculate statistics
    const total = eventParticipants.length;
    const registered = eventParticipants.filter(p => p.poa_status === 'registered').length;
    const minted = eventParticipants.filter(p => p.poa_status === 'minted').length;
    const transferred = eventParticipants.filter(p => p.poa_status === 'transferred').length;
    const certificates = eventParticipants.filter(p => p.certificate_status === 'completed' || p.certificate_status === 'transferred').length;

    return (
      <div className="space-y-4">
        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-4 bg-muted/50 rounded-lg">
          <div className="text-center">
            <div className="text-2xl font-bold">{total}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{registered}</div>
            <div className="text-xs text-muted-foreground">Registered</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{minted}</div>
            <div className="text-xs text-muted-foreground">Minted</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{transferred}</div>
            <div className="text-xs text-muted-foreground">Transferred</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{certificates}</div>
            <div className="text-xs text-muted-foreground">Certificates</div>
          </div>
        </div>

        {/* Selection Controls */}
        <div className="flex flex-wrap gap-2 p-4 bg-muted/30 rounded-lg border">
          <Button
            onClick={() => handleSelectNext25(eventId)}
            variant="outline"
            size="sm"
          >
            Select Next 25
          </Button>
          <Button
            onClick={clearSelection}
            variant="outline"
            size="sm"
            disabled={selectedParticipants.size === 0}
          >
            Clear Selection ({selectedParticipants.size})
          </Button>
          <div className="text-sm text-muted-foreground flex items-center">
            Selected: {selectedParticipants.size}/25 participants
          </div>
        </div>

        {/* Participants Table */}
        <div className="rounded-md border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium">
                    <Checkbox
                      checked={selectedParticipants.size > 0}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          // Select up to 25 participants from current event
                          const next25 = eventParticipants.slice(0, 25);
                          setSelectedParticipants(new Set(next25.map(p => p.id)));
                        } else {
                          clearSelection();
                        }
                      }}
                    />
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-medium">Name</th>
                  <th className="px-4 py-2 text-left text-sm font-medium">Email</th>
                  <th className="px-4 py-2 text-left text-sm font-medium">Team</th>
                  <th className="px-4 py-2 text-left text-sm font-medium">Wallet</th>
                  <th className="px-4 py-2 text-left text-sm font-medium">PoA Status</th>
                  <th className="px-4 py-2 text-left text-sm font-medium">Cert Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {eventParticipants.map((participant, index) => {
                  const getPoABadge = () => {
                    switch(participant.poa_status) {
                      case 'registered':
                        return <Badge variant="secondary" className="text-xs">📝 Registered</Badge>;
                      case 'minted':
                        return <Badge variant="default" className="text-xs">🏭 Minted #{participant.poa_token_id}</Badge>;
                      case 'transferred':
                        return <Badge variant="default" className="text-xs bg-green-100 text-green-800">✅ Transferred #{participant.poa_token_id}</Badge>;
                      default:
                        return <Badge variant="destructive" className="text-xs">❓ Unknown</Badge>;
                    }
                  };

                  const getCertBadge = () => {
                    switch(participant.certificate_status) {
                      case 'not_eligible':
                        return <Badge variant="outline" className="text-xs">⏳ Not Eligible</Badge>;
                      case 'eligible':
                        return <Badge variant="secondary" className="text-xs">🎯 Eligible</Badge>;
                      case 'completed':
                        return <Badge variant="default" className="text-xs">✅ Completed #{participant.certificate_token_id}</Badge>;
                      case 'transferred':
                        return <Badge variant="default" className="text-xs bg-green-100 text-green-800">🏆 Transferred #{participant.certificate_token_id}</Badge>;
                      default:
                        return <Badge variant="destructive" className="text-xs">❓ {participant.certificate_status}</Badge>;
                    }
                  };

                  return (
                    <tr key={index} className="hover:bg-muted/50">
                      <td className="px-4 py-2">
                        <Checkbox
                          checked={selectedParticipants.has(participant.id)}
                          onCheckedChange={() => handleParticipantToggle(participant.id)}
                        />
                      </td>
                      <td className="px-4 py-2 text-sm">{participant.name}</td>
                      <td className="px-4 py-2 text-sm">{participant.email}</td>
                      <td className="px-4 py-2 text-sm">{participant.team_name || 'N/A'}</td>
                      <td className="px-4 py-2 text-sm font-mono" title={participant.wallet_address}>
                        {participant.wallet_address.substring(0, 6)}...{participant.wallet_address.slice(-4)}
                      </td>
                      <td className="px-4 py-2">{getPoABadge()}</td>
                      <td className="px-4 py-2">{getCertBadge()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // Login UI
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Organizer Login</CardTitle>
            <CardDescription>
              {loginStep === 'email' 
                ? 'Enter your authorized organizer email' 
                : 'Enter the OTP code sent to your email'
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loginStep === 'email' ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="organizer@0x.day"
                    onKeyDown={(e) => e.key === 'Enter' && handleSendOTP()}
                  />
                </div>
                <Button 
                  onClick={handleSendOTP}
                  disabled={isSubmitting}
                  className="w-full"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  {isSubmitting ? 'Sending...' : 'Send OTP Code'}
                </Button>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="otp">OTP Code</Label>
                  <Input
                    id="otp"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="123456"
                    maxLength={6}
                    onKeyDown={(e) => e.key === 'Enter' && handleVerifyOTP()}
                  />
                  <p className="text-sm text-muted-foreground">
                    Check your email: {loginEmail}
                  </p>
                </div>
                <div className="space-y-2">
                  <Button 
                    onClick={handleVerifyOTP}
                    disabled={isSubmitting}
                    className="w-full"
                  >
                    {isSubmitting ? 'Verifying...' : 'Verify & Login'}
                  </Button>
                  <Button 
                    onClick={() => {
                      setLoginStep('email');
                      setOtpCode('');
                    }}
                    variant="outline"
                    className="w-full"
                  >
                    Back to Email
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main authenticated dashboard
  if (eventsLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header with user info and controls */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold gradient-text">Organizer Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome, {session?.email}
              {session?.isRoot && <Badge className="ml-2" variant="default">Root Admin</Badge>}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setShowEmailManagement(true)}
              variant="outline"
              size="sm"
            >
              <Settings className="h-4 w-4 mr-2" />
              Manage Organizers
            </Button>
            <Button 
              onClick={() => setShowCreateEvent(true)}
              variant="web3"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Event
            </Button>
            <Button 
              onClick={() => setShowTemplateManager(true)}
              variant="outline"
              size="sm"
            >
              <FileText className="h-4 w-4 mr-2" />
              Templates
            </Button>
            <Button
              onClick={handleLogout}
              variant="ghost"
              size="sm"
            >
              Logout
            </Button>
          </div>
        </div>

        {/* Email Management Dialog */}
        <Dialog open={showEmailManagement} onOpenChange={setShowEmailManagement}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Manage Organizer Emails</DialogTitle>
              <DialogDescription>
                Add or remove organizer email addresses. Root emails cannot be removed.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {/* Add new email */}
              <div className="flex gap-2">
                <Input
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="new.organizer@example.com"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddEmail()}
                />
                <Button onClick={handleAddEmail}>Add Email</Button>
              </div>

              {/* Email list */}
              <div className="space-y-2">
                <h4 className="font-medium">Current Organizers</h4>
                <div className="max-h-64 overflow-y-auto border rounded-md">
                  {organizerEmails.map((email) => (
                    <div key={email.email} className="flex items-center justify-between p-3 border-b last:border-b-0">
                      <div className="flex items-center gap-2">
                        <span>{email.email}</span>
                        {email.is_root && (
                          <Badge variant="default" className="text-xs">
                            <Shield className="h-3 w-3 mr-1" />
                            Root
                          </Badge>
                        )}
                      </div>
                      {!email.is_root && (
                        <Button
                          onClick={() => handleRemoveEmail(email.email)}
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Template Management Dialog */}
        <Dialog open={showTemplateManager} onOpenChange={setShowTemplateManager}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Certificate Template Management</DialogTitle>
              <DialogDescription>
                Upload and manage certificate templates. Templates will be available when creating events.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              {/* Upload new template */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Upload New Template</h3>
                <div className="flex gap-4 items-end">
                  <div className="flex-1">
                    <Label htmlFor="template-file">Select PDF Template</Label>
                    <Input
                      id="template-file"
                      type="file"
                      accept=".pdf"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      className="mt-1"
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Upload PDF files only (max 10MB)
                    </p>
                  </div>
                  <Button 
                    onClick={() => {
                      if (selectedFile && session?.sessionToken) {
                        uploadTemplateMutation.mutate({ 
                          file: selectedFile, 
                          sessionToken: session.sessionToken 
                        });
                      }
                    }}
                    disabled={!selectedFile || uploadTemplateMutation.isPending}
                    variant="web3"
                  >
                    {uploadTemplateMutation.isPending ? 'Uploading...' : 'Upload Template'}
                  </Button>
                </div>
              </div>

              {/* Existing templates */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Available Templates</h3>
                <div className="grid gap-4">
                  {templatesData?.templates?.length ? (
                    templatesData.templates.map((template) => (
                      <div key={template.filename} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <h4 className="font-medium">{template.display_name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {template.filename} • {(template.file_size / 1024 / 1024).toFixed(2)} MB
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Created: {new Date(template.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Badge variant="secondary">PDF</Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (session?.sessionToken) {
                                // Note: Delete functionality can be added here
                                toast({
                                  title: "Delete functionality",
                                  description: "Template deletion coming soon",
                                });
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No templates uploaded yet</p>
                      <p className="text-sm">Upload your first PDF template above</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Create Event Form */}
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
                    value={eventForm.event_name}
                    onChange={(e) => setEventForm(prev => ({ ...prev, event_name: e.target.value }))}
                    placeholder="Web3 Hackathon 2024"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="event-date">Event Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !eventForm.event_date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {eventForm.event_date ? (
                          format(new Date(eventForm.event_date), "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-4" align="start">
                      <div className="space-y-4">
                        <div className="flex space-x-2">
                          <div className="flex-1">
                            <Label className="text-sm">Month</Label>
                            <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(parseInt(value))}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Array.from({ length: 12 }, (_, i) => (
                                  <SelectItem key={i} value={i.toString()}>
                                    {new Date(2024, i, 1).toLocaleDateString('en-US', { month: 'long' })}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex-1">
                            <Label className="text-sm">Year</Label>
                            <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Array.from({ length: 11 }, (_, i) => (
                                  <SelectItem key={i} value={(2020 + i).toString()}>
                                    {2020 + i}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <CalendarComponent
                          mode="single"
                          selected={eventForm.event_date ? new Date(eventForm.event_date) : undefined}
                          onSelect={(date) => {
                            if (date) {
                              setEventForm(prev => ({ ...prev, event_date: format(date, "yyyy-MM-dd") }));
                            }
                          }}
                          month={new Date(selectedYear, selectedMonth)}
                          onMonthChange={(date) => {
                            setSelectedMonth(date.getMonth());
                            setSelectedYear(date.getFullYear());
                          }}
                          initialFocus
                        />
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sponsors">Sponsors (comma-separated)</Label>
                <Input
                  id="sponsors"
                  value={eventForm.sponsors}
                  onChange={(e) => setEventForm(prev => ({ ...prev, sponsors: e.target.value }))}
                  placeholder="Sponsor1, Sponsor2, Sponsor3"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="template">Certificate Template</Label>
                <Select 
                  value={eventForm.certificate_template} 
                  onValueChange={(value) => setEventForm(prev => ({ ...prev, certificate_template: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a template (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {templatesData?.templates?.map((template) => (
                      <SelectItem key={template.filename} value={template.filename}>
                        {template.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="event-description">Description *</Label>
                <Textarea
                  id="event-description"
                  value={eventForm.description}
                  onChange={(e) => setEventForm(prev => ({ ...prev, description: e.target.value }))}
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

        {/* Progress Dialog */}
        <ProgressDialog
          open={progressDialog.open}
          onOpenChange={(open) => setProgressDialog(prev => ({ ...prev, open }))}
          title={progressDialog.title}
          steps={progressDialog.steps}
          showSuccessAnimation={progressDialog.showSuccessAnimation}
          onComplete={() => {
            setTimeout(() => {
              setProgressDialog(prev => ({ ...prev, open: false }));
            }, 1000);
          }}
        />

        {/* Events Grid */}
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
            <div className="space-y-6">
              {events.map((event) => (
                <Card key={event.id} className="transition-all duration-200">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <CardTitle className="text-lg">{event.event_name}</CardTitle>
                          <Badge variant={event.is_active ? "default" : "secondary"} className="text-xs">
                            {event.is_active ? '✅ Active' : '❌ Inactive'}
                          </Badge>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleEventStatus(event.id, event.is_active);
                            }}
                            disabled={loadingStates[`toggle-${event.id}`]}
                            className="h-6 px-2 text-xs"
                          >
                            {loadingStates[`toggle-${event.id}`] ? 'Updating...' : event.is_active ? 'Deactivate' : 'Activate'}
                          </Button>
                        </div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="font-mono text-xs">
                            {event.event_code}
                          </Badge>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              copyEventCode(event.event_code);
                            }}
                            className="h-6 px-2 text-xs"
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            Copy
                          </Button>
                          <span className="text-xs text-muted-foreground">ID: {event.id}</span>
                        </div>
                        {event.event_date && (
                          <p className="text-sm text-muted-foreground">📅 {event.event_date}</p>
                        )}
                        <CardDescription className="mt-2">{event.description}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="flex flex-wrap gap-2 mb-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleParticipants(event.id)}
                      >
                        <Users className="h-4 w-4 mr-2" />
                        {expandedEvents[event.id] ? 'Hide' : 'View'} Participants
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleBulkMint(event.id)}
                        disabled={loadingStates[`mint-${event.id}`] || isBulkMintLoading || isBulkMintWaiting}
                      >
                        <Factory className="h-4 w-4 mr-2" />
                        {(loadingStates[`mint-${event.id}`] || isBulkMintLoading || isBulkMintWaiting) ? 'Minting...' : `Mint PoA (${selectedParticipants.size})`}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleBatchTransfer(event.id)}
                        disabled={loadingStates[`transfer-${event.id}`] || isBatchTransferLoading || isBatchTransferWaiting}
                      >
                        <Send className="h-4 w-4 mr-2" />
                        {(loadingStates[`transfer-${event.id}`] || isBatchTransferLoading || isBatchTransferWaiting) ? 'Transferring...' : `Transfer PoA (${selectedParticipants.size})`}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleGenerateCertificates(event.id)}
                        disabled={loadingStates[`cert-${event.id}`]}
                      >
                        <Award className="h-4 w-4 mr-2" />
                        {loadingStates[`cert-${event.id}`] ? 'Generating...' : `Generate Certs (${selectedParticipants.size})`}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCheckCertificateStatus(event.id)}
                        disabled={loadingStates[`status-${event.id}`]}
                      >
                        <BarChart3 className="h-4 w-4 mr-2" />
                        {loadingStates[`status-${event.id}`] ? 'Checking...' : 'Certificate Status'}
                      </Button>
                    </div>

                    {/* Participants Section */}
                    {expandedEvents[event.id] && (
                      <div className="border-t pt-4">
                        <h4 className="font-semibold mb-3">Participants</h4>
                        {renderParticipants(event.id)}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}