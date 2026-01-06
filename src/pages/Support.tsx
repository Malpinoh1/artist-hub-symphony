import React, { useState, useEffect, useRef } from 'react';
import { Plus, MessageSquare, Clock, CheckCircle, AlertCircle, Send, ArrowLeft } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import AnimatedCard from '../components/AnimatedCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '../integrations/supabase/client';
import { useToast } from '../hooks/use-toast';
import { useAuth } from '../contexts/AuthContext';

interface Ticket {
  id: string;
  user_id: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  category: string | null;
  created_at: string;
  updated_at: string;
}

interface TicketMessage {
  id: string;
  ticket_id: string;
  user_id: string;
  message: string;
  is_admin_reply: boolean;
  created_at: string;
}

const Support = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    priority: 'medium',
    category: ''
  });

  useEffect(() => {
    if (user) {
      fetchTickets();
      setupRealtimeSubscription();
    }
  }, [user]);

  useEffect(() => {
    if (selectedTicket) {
      fetchMessages(selectedTicket.id);
      setupMessagesRealtimeSubscription(selectedTicket.id);
    }
  }, [selectedTicket]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('support-tickets-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_tickets',
          filter: `user_id=eq.${user?.id}`
        },
        (payload) => {
          console.log('Ticket change received:', payload);
          if (payload.eventType === 'INSERT') {
            setTickets(prev => [payload.new as Ticket, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setTickets(prev => prev.map(t => 
              t.id === payload.new.id ? payload.new as Ticket : t
            ));
            if (selectedTicket?.id === payload.new.id) {
              setSelectedTicket(payload.new as Ticket);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const setupMessagesRealtimeSubscription = (ticketId: string) => {
    const channel = supabase
      .channel(`ticket-messages-${ticketId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_ticket_messages',
          filter: `ticket_id=eq.${ticketId}`
        },
        (payload) => {
          console.log('Message received:', payload);
          setMessages(prev => [...prev, payload.new as TicketMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTickets(data || []);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      toast({
        title: 'Error',
        description: 'Failed to load support tickets.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (ticketId: string) => {
    try {
      const { data, error } = await supabase
        .from('support_ticket_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const handleCreateTicket = async () => {
    if (!formData.subject.trim() || !formData.description.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in subject and description.',
        variant: 'destructive'
      });
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .insert({
          user_id: user?.id,
          subject: formData.subject.trim(),
          description: formData.description.trim(),
          priority: formData.priority,
          category: formData.category || null
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Ticket Created',
        description: 'Your support ticket has been submitted successfully.'
      });

      setFormData({ subject: '', description: '', priority: 'medium', category: '' });
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error('Error creating ticket:', error);
      toast({
        title: 'Error',
        description: 'Failed to create support ticket.',
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedTicket) return;

    setSendingMessage(true);
    try {
      const { error } = await supabase
        .from('support_ticket_messages')
        .insert({
          ticket_id: selectedTicket.id,
          user_id: user?.id,
          message: newMessage.trim(),
          is_admin_reply: false
        });

      if (error) throw error;
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message.',
        variant: 'destructive'
      });
    } finally {
      setSendingMessage(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      open: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      in_progress: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      resolved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      closed: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
    };
    return (
      <Badge className={styles[status as keyof typeof styles] || styles.open}>
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const styles = {
      low: 'bg-gray-100 text-gray-800',
      medium: 'bg-blue-100 text-blue-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800'
    };
    return (
      <Badge variant="outline" className={styles[priority as keyof typeof styles]}>
        {priority}
      </Badge>
    );
  };

  if (selectedTicket) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
        <Navbar />
        <main className="flex-grow pt-24 pb-16">
          <div className="container mx-auto px-4">
            <AnimatedCard>
              <div className="glass-panel p-6 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                <Button
                  variant="ghost"
                  onClick={() => setSelectedTicket(null)}
                  className="mb-4"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Tickets
                </Button>

                <div className="border-b pb-4 mb-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                        {selectedTicket.subject}
                      </h1>
                      <p className="text-slate-600 dark:text-slate-400 mt-1">
                        {selectedTicket.description}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {getStatusBadge(selectedTicket.status)}
                      {getPriorityBadge(selectedTicket.priority)}
                    </div>
                  </div>
                </div>

                <ScrollArea className="h-[400px] mb-4 pr-4">
                  <div className="space-y-4">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.is_admin_reply ? 'justify-start' : 'justify-end'}`}
                      >
                        <div
                          className={`max-w-[70%] p-3 rounded-lg ${
                            msg.is_admin_reply
                              ? 'bg-slate-100 dark:bg-slate-700'
                              : 'bg-blue-500 text-white'
                          }`}
                        >
                          <p className="text-sm">{msg.message}</p>
                          <p className={`text-xs mt-1 ${
                            msg.is_admin_reply ? 'text-slate-500' : 'text-blue-100'
                          }`}>
                            {msg.is_admin_reply ? 'Support Team' : 'You'} • {new Date(msg.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {selectedTicket.status !== 'closed' && (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Type your message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      disabled={sendingMessage}
                    />
                    <Button onClick={handleSendMessage} disabled={sendingMessage || !newMessage.trim()}>
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            </AnimatedCard>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <Navbar />
      <main className="flex-grow pt-24 pb-16">
        <div className="container mx-auto px-4">
          <AnimatedCard>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-display font-bold text-slate-900 dark:text-white">
                  Support Center
                </h1>
                <p className="text-slate-600 dark:text-slate-400 mt-1">
                  Get help from our support team
                </p>
              </div>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    New Ticket
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Support Ticket</DialogTitle>
                    <DialogDescription>
                      Describe your issue and we'll get back to you as soon as possible.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="subject">Subject</Label>
                      <Input
                        id="subject"
                        value={formData.subject}
                        onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                        placeholder="Brief summary of your issue"
                      />
                    </div>
                    <div>
                      <Label htmlFor="category">Category</Label>
                      <Select
                        value={formData.category}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="account">Account</SelectItem>
                          <SelectItem value="billing">Billing</SelectItem>
                          <SelectItem value="releases">Releases</SelectItem>
                          <SelectItem value="technical">Technical Issue</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="priority">Priority</Label>
                      <Select
                        value={formData.priority}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Provide details about your issue..."
                        rows={4}
                      />
                    </div>
                    <Button onClick={handleCreateTicket} disabled={submitting} className="w-full">
                      {submitting ? 'Submitting...' : 'Submit Ticket'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto mb-4" />
                <p className="text-slate-600">Loading tickets...</p>
              </div>
            ) : tickets.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <MessageSquare className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
                    No Support Tickets
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 mb-4">
                    You haven't created any support tickets yet.
                  </p>
                  <Button onClick={() => setIsCreateDialogOpen(true)}>
                    Create Your First Ticket
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {tickets.map((ticket) => (
                  <Card
                    key={ticket.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setSelectedTicket(ticket)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-slate-900 dark:text-white">
                            {ticket.subject}
                          </h3>
                          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
                            {ticket.description}
                          </p>
                          <div className="flex items-center gap-2 mt-2 text-sm text-slate-500">
                            <Clock className="w-4 h-4" />
                            {new Date(ticket.created_at).toLocaleDateString()}
                            {ticket.category && (
                              <Badge variant="outline" className="ml-2">
                                {ticket.category}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 items-end">
                          {getStatusBadge(ticket.status)}
                          {getPriorityBadge(ticket.priority)}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </AnimatedCard>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Support;
