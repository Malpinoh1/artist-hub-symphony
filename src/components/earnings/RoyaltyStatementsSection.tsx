import React, { useState, useEffect } from 'react';
import { FileText, Download, Calendar, DollarSign, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import {
  fetchArtistRoyaltyStatements,
  fetchArtistPlatformEarnings,
  RoyaltyStatement,
  PlatformEarning
} from '../../services/platformEarningsService';

interface RoyaltyStatementsSectionProps {
  artistId: string;
}

const RoyaltyStatementsSection: React.FC<RoyaltyStatementsSectionProps> = ({ artistId }) => {
  const { toast } = useToast();
  const [statements, setStatements] = useState<RoyaltyStatement[]>([]);
  const [platformEarnings, setPlatformEarnings] = useState<PlatformEarning[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (artistId) {
      loadData();
    }
  }, [artistId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statementsData, earningsData] = await Promise.all([
        fetchArtistRoyaltyStatements(artistId),
        fetchArtistPlatformEarnings(artistId)
      ]);
      
      setStatements(statementsData);
      setPlatformEarnings(earningsData);
    } catch (error) {
      console.error('Error loading royalty data:', error);
      toast({
        title: "Error",
        description: "Failed to load royalty statements.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadStatement = (pdfUrl: string, statementNumber: string) => {
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = `royalty-statement-${statementNumber}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Download Started",
      description: "Your royalty statement is being downloaded."
    });
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

  // Calculate summary statistics
  const totalEarnings = platformEarnings.reduce((sum, earning) => sum + Number(earning.earnings_amount), 0);
  const totalStreams = platformEarnings.reduce((sum, earning) => sum + earning.streams, 0);
  const currentMonthEarnings = platformEarnings
    .filter(earning => {
      const earningDate = new Date(earning.period_start);
      const currentDate = new Date();
      return earningDate.getMonth() === currentDate.getMonth() && 
             earningDate.getFullYear() === currentDate.getFullYear();
    })
    .reduce((sum, earning) => sum + Number(earning.earnings_amount), 0);

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading royalty data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Royalty Statements</h2>
        <p className="text-muted-foreground">Download your detailed earnings statements</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₦{totalEarnings.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">All time earnings</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Streams</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStreams.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Across all platforms</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₦{currentMonthEarnings.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Current month earnings</p>
          </CardContent>
        </Card>
      </div>

      {/* Platform Breakdown */}
      {platformEarnings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Platform Breakdown</CardTitle>
            <CardDescription>Your earnings by streaming platform</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(
                platformEarnings.reduce((acc, earning) => {
                  if (!acc[earning.platform]) {
                    acc[earning.platform] = { streams: 0, earnings: 0 };
                  }
                  acc[earning.platform].streams += earning.streams;
                  acc[earning.platform].earnings += Number(earning.earnings_amount);
                  return acc;
                }, {} as Record<string, { streams: number; earnings: number }>)
              ).map(([platform, data]) => (
                <div key={platform} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <div className="font-medium">{platform}</div>
                    <div className="text-sm text-muted-foreground">{data.streams.toLocaleString()} streams</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">₦{data.earnings.toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Royalty Statements Table */}
      <Card>
        <CardHeader>
          <CardTitle>Statements ({statements.length})</CardTitle>
          <CardDescription>Your generated royalty statements</CardDescription>
        </CardHeader>
        <CardContent>
          {statements.length === 0 ? (
            <Alert>
              <FileText className="h-4 w-4" />
              <AlertDescription>
                No royalty statements available yet. Statements are generated monthly once you have earnings data.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Statement #</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Streams</TableHead>
                    <TableHead>Earnings</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Generated</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {statements.map((statement) => (
                    <TableRow key={statement.id}>
                      <TableCell className="font-medium">
                        {statement.statement_number}
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(statement.period_start).toLocaleDateString()} - {new Date(statement.period_end).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {statement.total_streams.toLocaleString()}
                      </TableCell>
                      <TableCell className="font-medium">
                        ₦{statement.total_earnings.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(statement.status)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(statement.generated_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {statement.pdf_url ? (
                          <Button
                            size="sm"
                            onClick={() => downloadStatement(statement.pdf_url!, statement.statement_number)}
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </Button>
                        ) : (
                          <Badge variant="outline">Processing</Badge>
                        )}
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

export default RoyaltyStatementsSection;