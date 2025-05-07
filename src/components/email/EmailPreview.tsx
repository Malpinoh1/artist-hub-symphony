
import * as React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import WelcomeEmail from './WelcomeEmail';
import ReleaseApprovedEmail from './ReleaseApprovedEmail';
import EarningsUpdateEmail from './EarningsUpdateEmail';
import WithdrawalConfirmationEmail from './WithdrawalConfirmationEmail';
import TakedownRequestEmail from './TakedownRequestEmail';

const EmailPreview: React.FC = () => {
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Email Template Previews</h1>
      
      <Tabs defaultValue="welcome">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5">
          <TabsTrigger value="welcome">Welcome</TabsTrigger>
          <TabsTrigger value="release">Release Approved</TabsTrigger>
          <TabsTrigger value="earnings">Earnings Update</TabsTrigger>
          <TabsTrigger value="withdrawal">Withdrawal</TabsTrigger>
          <TabsTrigger value="takedown">Takedown Request</TabsTrigger>
        </TabsList>
        
        <div className="mt-6 border border-gray-200 rounded-md p-4 bg-gray-50">
          <TabsContent value="welcome">
            <WelcomeEmail 
              name="John Doe" 
              loginUrl="https://malpinohditstro.com/dashboard" 
            />
          </TabsContent>
          
          <TabsContent value="release">
            <ReleaseApprovedEmail 
              name="John Doe"
              releaseName="Summer Vibes EP"
              releaseUrl="https://malpinohditstro.com/releases/summer-vibes"
            />
          </TabsContent>
          
          <TabsContent value="earnings">
            <EarningsUpdateEmail
              name="John Doe"
              amount={1250.75}
              period="April 2025"
              earningsUrl="https://malpinohditstro.com/dashboard/earnings"
            />
          </TabsContent>
          
          <TabsContent value="withdrawal">
            <WithdrawalConfirmationEmail
              name="John Doe"
              amount={850.00}
              withdrawalDate="May 5, 2025"
              estimatedArrivalDate="May 8-10, 2025"
              paymentMethod="Bank Transfer"
              referenceId="WD-2025050712345"
              earningsUrl="https://malpinohditstro.com/dashboard/earnings"
            />
          </TabsContent>
          
          <TabsContent value="takedown">
            <TakedownRequestEmail
              name="John Doe"
              releaseName="Summer Vibes EP"
              requestDate="May 6, 2025"
              estimatedCompletionDate="May 20, 2025"
              reason="Content update needed"
              releaseUrl="https://malpinohditstro.com/releases/summer-vibes"
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default EmailPreview;
