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
import { Plus, Users, Award, Send, Download, BarChart3, Copy, Mail, Trash2, Settings, Shield } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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
  });

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
      const response = await fetch('http://localhost:8000/organizer/login', {
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
      const response = await fetch('http://localhost:8000/organizer/verify-otp', {
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
      const response = await fetch(`http://localhost:8000/organizer/emails?session_token=${session.sessionToken}`);
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
      const response = await fetch('http://localhost:8000/organizer/add-email', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'session_token': session.sessionToken,
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
      const response = await fetch('http://localhost:8000/organizer/remove-email', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'session_token': session.sessionToken,
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

  // Event management functions (simplified versions from original)
  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['events'],
    queryFn: api.getEvents,
    enabled: isAuthenticated,
  });

  const { data: participants = [], isLoading: participantsLoading } = useQuery({
    queryKey: ['participants', selectedEventId],
    queryFn: () => selectedEventId ? api.getParticipants(selectedEventId) : Promise.resolve([]),
    enabled: !!selectedEventId && isAuthenticated,
  });

  const createEventMutation = useMutation({
    mutationFn: api.createEvent,
    onSuccess: (event) => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setShowCreateEvent(false);
      setEventForm({ event_name: '', description: '', event_date: '', sponsors: '' });
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

    createEventMutation.mutate({
      ...eventForm,
      organizer_wallet: address,
    });
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
                  <Input
                    type="date"
                    id="event-date"
                    value={eventForm.event_date}
                    onChange={(e) => setEventForm(prev => ({ ...prev, event_date: e.target.value }))}
                  />
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
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map((event) => (
                <Card key={event.id} className="cursor-pointer transition-all duration-200 hover:border-primary/50" 
                      onClick={() => setSelectedEventId(event.id.toString())}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{event.event_name}</CardTitle>
                      <Badge variant="outline" className="font-mono text-xs">
                        {event.event_code}
                      </Badge>
                    </div>
                    <CardDescription>{event.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm">
                      <span>📅 {event.event_date || 'No date'}</span>
                      <span className="text-muted-foreground">ID: {event.id}</span>
                    </div>
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