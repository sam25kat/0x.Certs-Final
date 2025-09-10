import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card-web3';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { api, type Event, type Participant } from '@/lib/api';
import { Plus, Users, Award, Send, Download, BarChart3 } from 'lucide-react';

export default function OrganizerDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [newEvent, setNewEvent] = useState({
    name: '',
    description: '',
    sponsor_name: '',
    sponsor_logo: '',
  });

  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['events'],
    queryFn: api.getEvents,
  });

  const { data: participants = [] } = useQuery({
    queryKey: ['participants', selectedEventId],
    queryFn: () => selectedEventId ? api.getParticipants(selectedEventId) : Promise.resolve([]),
    enabled: !!selectedEventId,
  });

  const createEventMutation = useMutation({
    mutationFn: api.createEvent,
    onSuccess: (event) => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setShowCreateEvent(false);
      setNewEvent({ name: '', description: '', sponsor_name: '', sponsor_logo: '' });
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

  const bulkMintMutation = useMutation({
    mutationFn: api.bulkMintPoAs,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['participants'] });
      toast({
        title: "Bulk mint completed",
        description: `Successfully minted ${result.success} PoAs`,
      });
    },
  });

  const generateCertificatesMutation = useMutation({
    mutationFn: api.generateCertificates,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['participants'] });
      toast({
        title: "Certificates generated",
        description: `Generated ${result.success} certificates`,
      });
    },
  });

  const handleCreateEvent = () => {
    if (!newEvent.name || !newEvent.description) {
      toast({
        title: "Please fill in required fields",
        variant: "destructive",
      });
      return;
    }

    createEventMutation.mutate({
      ...newEvent,
      event_code: Math.random().toString().slice(2, 8), // Generate 6-digit code
    });
  };

  const EventCard = ({ event }: { event: Event }) => (
    <Card className="cursor-pointer transition-all duration-200 hover:border-primary/50" 
          onClick={() => setSelectedEventId(event.id)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{event.name}</CardTitle>
          <Badge variant="outline" className="font-mono">
            {event.event_code}
          </Badge>
        </div>
        <CardDescription>{event.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <span>{event.participants_count} participants</span>
          </div>
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4 text-primary" />
            <span>{event.certificates_issued} certificates</span>
          </div>
        </div>
        {event.sponsor_name && (
          <div className="mt-3 pt-3 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Sponsored by <span className="font-medium">{event.sponsor_name}</span>
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
                    value={newEvent.name}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Web3 Hackathon 2024"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sponsor-name">Sponsor Name</Label>
                  <Input
                    id="sponsor-name"
                    value={newEvent.sponsor_name}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, sponsor_name: e.target.value }))}
                    placeholder="Acme Corp"
                  />
                </div>
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

              <div className="space-y-2">
                <Label htmlFor="sponsor-logo">Sponsor Logo URL</Label>
                <Input
                  id="sponsor-logo"
                  value={newEvent.sponsor_logo}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, sponsor_logo: e.target.value }))}
                  placeholder="https://example.com/logo.png"
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
                        {participants.filter(p => p.poa_minted).length}
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
                        {participants.filter(p => p.certificate_minted).length}
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
                      onClick={() => bulkMintMutation.mutate(selectedEventId)}
                      disabled={bulkMintMutation.isPending}
                      variant="outline"
                      size="sm"
                    >
                      {bulkMintMutation.isPending ? 'Minting...' : 'Bulk Mint PoAs'}
                    </Button>
                    <Button
                      onClick={() => generateCertificatesMutation.mutate(selectedEventId)}
                      disabled={generateCertificatesMutation.isPending}
                      variant="outline"
                      size="sm"
                    >
                      {generateCertificatesMutation.isPending ? 'Generating...' : 'Generate Certificates'}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <div className="grid grid-cols-5 gap-4 p-4 border-b border-border bg-muted/20 text-sm font-medium">
                    <span>Name</span>
                    <span>Email</span>
                    <span>Team</span>
                    <span>PoA</span>
                    <span>Certificate</span>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {participants.map((participant) => (
                      <div key={participant.id} className="grid grid-cols-5 gap-4 p-4 border-b border-border last:border-b-0">
                        <span className="font-medium">{participant.name}</span>
                        <span className="text-muted-foreground">{participant.email}</span>
                        <span className="text-muted-foreground">{participant.team || '-'}</span>
                        <Badge variant={participant.poa_minted ? 'default' : 'secondary'} className="w-fit">
                          {participant.poa_minted ? 'Minted' : 'Pending'}
                        </Badge>
                        <Badge variant={participant.certificate_minted ? 'default' : 'secondary'} className="w-fit">
                          {participant.certificate_minted ? 'Issued' : 'Pending'}
                        </Badge>
                      </div>
                    ))}
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