import React, { useState, useEffect } from 'react';
import { supabase } from '../../integrations/supabase/client';
import { FileText, Download, Send, Eye, Trash2, Calendar, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import {
  fetchAllRoyaltyStatements,
  updateRoyaltyStatement,
  RoyaltyStatement
} from '../../services/platformEarningsService';

interface RoyaltyStatementsTabProps {
  onStatementUpdate?: () => void;
}

const RoyaltyStatementsTab: React.FC<RoyaltyStatementsTabProps> = ({ onStatementUpdate }) => {
  const { toast } = useToast();
  const [statements, setStatements] = useState<RoyaltyStatement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedArtist, setSelectedArtist] = useState<string>('');

  useEffect(() => {
    loadStatements();
  }, []);

  const loadStatements = async () => {
    try {
      setLoading(true);
      const data = await fetchAllRoyaltyStatements();
      setStatements(data);
    } catch (error) {
      console.error('Error loading statements:', error);
      toast({
        title: "Error",
        description: "Failed to load royalty statements.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id: string, status: 'draft' | 'finalized' | 'sent') => {
    try {
      await updateRoyaltyStatement(id, { status });
      toast({
        title: "Success",
        description: `Statement ${status} successfully.`
      });
      await loadStatements();
      onStatementUpdate?.();
    } catch (error) {
      console.error('Error updating statement:', error);
      toast({
        title: "Error",
        description: "Failed to update statement status.",
        variant: "destructive"
      });
    }
  };

  const handleGeneratePDF = async (statement: RoyaltyStatement) => {
    try {
      // Call the PDF generation edge function
      const { data, error } = await supabase.functions.invoke('generate-royalty-pdf', {
        body: { statementId: statement.id }
      });

      if (error) throw error;

      if (data?.pdfUrl) {
        await updateRoyaltyStatement(statement.id, { pdf_url: data.pdfUrl });
        toast({
          title: "Success",
          description: "PDF generated successfully!"
        });
        await loadStatements();
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Error",
        description: "Failed to generate PDF.",
        variant: "destructive"
      });
    }
  };

  const downloadPDF = (pdfUrl: string, statementNumber: string) => {
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = `royalty-statement-${statementNumber}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { label: 'Draft', className: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300' },
      finalized: { label: 'Finalized', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
      sent: { label: 'Sent', className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const filteredStatements = statements.filter(statement => {
    const matchesStatus = !selectedStatus || selectedStatus === 'all' || statement.status === selectedStatus;
    const matchesArtist = !selectedArtist || statement.artist_name?.includes(selectedArtist);
    return matchesStatus && matchesArtist;
  });

  const totalStatements = filteredStatements.length;
  const totalEarnings = filteredStatements.reduce((sum, s) => sum + Number(s.total_earnings), 0);
  const uniqueArtists = new Set(filteredStatements.map(s => s.artist_id)).size;

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading royalty statements...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Royalty Statements</h2>
          <p className="text-muted-foreground">Manage and distribute artist royalty statements</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Statements</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStatements}</div>
            <p className="text-xs text-muted-foreground">Generated statements</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Royalties</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalEarnings.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">In statements</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Artists</CardTitle>
            <Filter className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueArtists}</div>
            <p className="text-xs text-muted-foreground">With statements</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">Status</label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="finalized">Finalized</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setSelectedStatus('');
                  setSelectedArtist('');
                }}
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statements Table */}
      <Card>
        <CardHeader>
          <CardTitle>Royalty Statements ({filteredStatements.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredStatements.length === 0 ? (
            <Alert>
              <AlertDescription>
                No royalty statements found. Generate statements from the Platform Earnings tab.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Statement #</TableHead>
                    <TableHead>Artist</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Streams</TableHead>
                    <TableHead>Earnings</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Generated</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStatements.map((statement) => (
                    <TableRow key={statement.id}>
                      <TableCell className="font-medium">
                        {statement.statement_number}
                      </TableCell>
                      <TableCell>
                        {statement.artist_name}
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(statement.period_start).toLocaleDateString()} - {new Date(statement.period_end).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {statement.total_streams.toLocaleString()}
                      </TableCell>
                      <TableCell className="font-medium">
                        ${statement.total_earnings.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(statement.status)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(statement.generated_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {statement.pdf_url ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => downloadPDF(statement.pdf_url!, statement.statement_number)}
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleGeneratePDF(statement)}
                            >
                              <FileText className="w-4 h-4" />
                            </Button>
                          )}
                          
                          {statement.status === 'draft' && (
                            <Button
                              size="sm"
                              onClick={() => handleStatusUpdate(statement.id, 'finalized')}
                            >
                              Finalize
                            </Button>
                          )}
                          
                          {statement.status === 'finalized' && (
                            <Button
                              size="sm"
                              onClick={() => handleStatusUpdate(statement.id, 'sent')}
                            >
                              <Send className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RoyaltyStatementsTab;