import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RoyaltyStatementData {
  id: string;
  artist_id: string;
  statement_number: string;
  period_start: string;
  period_end: string;
  total_streams: number;
  total_earnings: number;
  currency: string;
  artist_name?: string;
  platform_earnings?: Array<{
    platform: string;
    streams: number;
    earnings_amount: number;
  }>;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { statementId } = await req.json();

    if (!statementId) {
      throw new Error('Statement ID is required');
    }

    // Fetch royalty statement data
    const { data: statement, error: statementError } = await supabaseClient
      .from('royalty_statements')
      .select(`
        *,
        artists:artist_id (
          name,
          email
        )
      `)
      .eq('id', statementId)
      .single();

    if (statementError) {
      throw new Error(`Failed to fetch statement: ${statementError.message}`);
    }

    // Fetch platform earnings for this period and artist
    const { data: platformEarnings, error: earningsError } = await supabaseClient
      .from('platform_earnings')
      .select('platform, streams, earnings_amount')
      .eq('artist_id', statement.artist_id)
      .gte('period_start', statement.period_start)
      .lte('period_end', statement.period_end);

    if (earningsError) {
      throw new Error(`Failed to fetch platform earnings: ${earningsError.message}`);
    }

    const statementData: RoyaltyStatementData = {
      ...statement,
      artist_name: statement.artists?.name,
      platform_earnings: platformEarnings || []
    };

    // Generate HTML for PDF
    const htmlContent = generateStatementHTML(statementData);

    // Generate PDF using HTML content
    const pdfResponse = await generatePDFFromHTML(htmlContent, statement.statement_number);

    // Upload PDF to Supabase Storage
    const fileName = `royalty-statement-${statement.statement_number}.pdf`;
    const { data: uploadData, error: uploadError } = await supabaseClient.storage
      .from('releases')
      .upload(`royalty-statements/${fileName}`, pdfResponse, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (uploadError) {
      throw new Error(`Failed to upload PDF: ${uploadError.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = supabaseClient.storage
      .from('releases')
      .getPublicUrl(`royalty-statements/${fileName}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        pdfUrl: publicUrl,
        fileName: fileName
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error generating PDF:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});

function generateStatementHTML(data: RoyaltyStatementData): string {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  };

  const platformRows = data.platform_earnings?.map(earning => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${earning.platform}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${earning.streams.toLocaleString()}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrency(earning.earnings_amount)}</td>
    </tr>
  `).join('') || '';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Royalty Statement - ${data.statement_number}</title>
    <style>
        body {
            font-family: 'Arial', sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background: #fff;
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 40px;
            padding-bottom: 20px;
            border-bottom: 3px solid #6366f1;
        }
        .logo {
            font-size: 28px;
            font-weight: bold;
            color: #6366f1;
        }
        .statement-info {
            text-align: right;
        }
        .statement-number {
            font-size: 18px;
            font-weight: bold;
            color: #374151;
        }
        .artist-info {
            background: #f9fafb;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
        }
        .period-info {
            background: #eff6ff;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid #3b82f6;
            margin-bottom: 30px;
        }
        .summary-cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .summary-card {
            background: #fff;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            border: 1px solid #e5e7eb;
        }
        .summary-card h3 {
            margin: 0 0 10px 0;
            font-size: 14px;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .summary-card .value {
            font-size: 24px;
            font-weight: bold;
            color: #111827;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
            background: #fff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        th {
            background: #6366f1;
            color: white;
            padding: 15px 12px;
            text-align: left;
            font-weight: 600;
        }
        th:last-child, td:last-child {
            text-align: right;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            color: #6b7280;
            font-size: 12px;
        }
        .status-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .status-finalized {
            background: #dbeafe;
            color: #1e40af;
        }
        @media print {
            body { margin: 0; padding: 20px; }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo">MALPINOHdistro</div>
        <div class="statement-info">
            <div class="statement-number">Statement #${data.statement_number}</div>
            <div style="color: #6b7280; margin-top: 5px;">Generated on ${formatDate(new Date().toISOString())}</div>
            <div style="margin-top: 10px;">
                <span class="status-badge status-finalized">Royalty Statement</span>
            </div>
        </div>
    </div>

    <div class="artist-info">
        <h2 style="margin: 0 0 10px 0; color: #374151;">Artist Information</h2>
        <div style="font-size: 18px; font-weight: 600; margin-bottom: 5px;">${data.artist_name || 'Unknown Artist'}</div>
        <div style="color: #6b7280;">Artist ID: ${data.artist_id}</div>
    </div>

    <div class="period-info">
        <h3 style="margin: 0 0 10px 0; color: #1e40af;">Reporting Period</h3>
        <div style="font-size: 16px; font-weight: 600;">
            ${formatDate(data.period_start)} - ${formatDate(data.period_end)}
        </div>
    </div>

    <div class="summary-cards">
        <div class="summary-card">
            <h3>Total Streams</h3>
            <div class="value">${data.total_streams.toLocaleString()}</div>
        </div>
        <div class="summary-card">
            <h3>Total Earnings</h3>
            <div class="value">${formatCurrency(data.total_earnings)}</div>
        </div>
        <div class="summary-card">
            <h3>Platforms</h3>
            <div class="value">${data.platform_earnings?.length || 0}</div>
        </div>
        <div class="summary-card">
            <h3>Currency</h3>
            <div class="value">${data.currency}</div>
        </div>
    </div>

    <h3 style="color: #374151; margin-bottom: 20px;">Platform Breakdown</h3>
    <table>
        <thead>
            <tr>
                <th>Platform</th>
                <th>Streams</th>
                <th>Earnings</th>
            </tr>
        </thead>
        <tbody>
            ${platformRows}
            <tr style="background: #f9fafb; font-weight: 600;">
                <td style="padding: 15px 12px; border-top: 2px solid #e5e7eb;">TOTAL</td>
                <td style="padding: 15px 12px; text-align: right; border-top: 2px solid #e5e7eb;">${data.total_streams.toLocaleString()}</td>
                <td style="padding: 15px 12px; text-align: right; border-top: 2px solid #e5e7eb;">${formatCurrency(data.total_earnings)}</td>
            </tr>
        </tbody>
    </table>

    <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px; margin-bottom: 30px;">
        <h4 style="margin: 0 0 10px 0; color: #92400e;">Important Information</h4>
        <ul style="margin: 0; padding-left: 20px; color: #92400e;">
            <li>This statement covers the period from ${formatDate(data.period_start)} to ${formatDate(data.period_end)}</li>
            <li>Earnings are calculated based on streaming platform reports</li>
            <li>Payment processing may take 3-5 business days</li>
            <li>For questions about this statement, contact support</li>
        </ul>
    </div>

    <div class="footer">
        <div style="margin-bottom: 10px;">
            <strong>MALPINOHdistro</strong> - Digital Music Distribution Platform
        </div>
        <div>
            This is an automated statement generated on ${formatDate(new Date().toISOString())}
        </div>
    </div>
</body>
</html>`;
}

async function generatePDFFromHTML(html: string, statementNumber: string): Promise<Uint8Array> {
  try {
    // Use an HTML-to-PDF service API (htmlcsstoimage.com, puppeteer-as-a-service, etc.)
    // For now, we'll use a simple fetch to a PDF generation service
    const response = await fetch('https://api.htmlcsstoimage.com/v1/image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Note: In production, you'd want to use proper authentication
      },
      body: JSON.stringify({
        html: html,
        css: '',
        width: 800,
        height: 1200,
        format: 'pdf',
        quality: 100
      })
    });

    if (!response.ok) {
      throw new Error(`PDF generation failed: ${response.statusText}`);
    }

    const pdfBuffer = await response.arrayBuffer();
    return new Uint8Array(pdfBuffer);
  } catch (error) {
    console.error('Error generating PDF from HTML:', error);
    // Fallback: generate a simple PDF-like structure
    return generateFallbackPDF(html);
  }
}

function generateFallbackPDF(html: string): Uint8Array {
  // Simple PDF header and content structure
  const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj

4 0 obj
<<
/Length ${html.length}
>>
stream
BT
/F1 12 Tf
50 750 Td
(Royalty Statement - Please contact support for proper PDF generation) Tj
ET
endstream
endobj

xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000074 00000 n 
0000000120 00000 n 
0000000179 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
${300 + html.length}
%%EOF`;

  const encoder = new TextEncoder();
  return encoder.encode(pdfContent);
}