import { ScrollArea } from '@/components/ui/scroll-area';

export function TermsAndConditions() {
  return (
    <ScrollArea className="h-[400px] w-full rounded-md border p-4">
      <div className="space-y-4 text-sm">
        <h2 className="text-xl font-bold">MALPINOHDISTRO – TERMS & CONDITIONS FOR MUSIC DISTRIBUTION</h2>
        <p className="text-muted-foreground">Last Updated: December 1, 2025</p>
        
        <p>
          These Terms & Conditions ("Terms") constitute a legally binding agreement ("Agreement") between you 
          ("Artist", "Label", "User", or "You") and MALPINOHDISTRO ("Company", "We", "Us", or "Our") regarding 
          the distribution of your music through the MALPINOHDISTRO platform ("Service").
        </p>

        <p>
          By submitting or distributing any music through MALPINOHDISTRO, you acknowledge and agree to the following:
        </p>

        <div className="space-y-3">
          <div>
            <h3 className="font-semibold text-base mb-2">1. ELIGIBILITY</h3>
            <p>To use MALPINOHDISTRO, you must:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Be at least 18 years old, or have legal guardian approval.</li>
              <li>Have full legal rights to distribute the music you upload.</li>
              <li>Agree to comply with all local and international copyright laws.</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-base mb-2">2. RIGHTS YOU GRANT TO MALPINOHDISTRO</h3>
            <p>By using our platform, you grant MALPINOHDISTRO the non-exclusive right to:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Distribute your music to digital stores, streaming services, and other partners.</li>
              <li>Use your name, artwork, and metadata for distribution and promotional purposes.</li>
              <li>Collect earnings and royalties generated from your distributed content on your behalf.</li>
            </ul>
            <p className="mt-2">
              You retain full ownership of your music. This Agreement does not transfer any copyrights to MALPINOHDISTRO.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-base mb-2">3. EARNING STRUCTURE & FEES</h3>
            
            <h4 className="font-medium mt-3 mb-1">3.1 Pay-Per-Release Users</h4>
            <p>Artists or labels who choose to pay per release agree to the following:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>MALPINOHDISTRO will collect 30% of all earnings (royalties, streaming revenue, store sales, etc.).</li>
              <li>The remaining 70% will be paid to the Artist/Label.</li>
              <li>Payment is processed monthly.</li>
            </ul>

            <h4 className="font-medium mt-3 mb-1">3.2 Subscribed Artists or Labels</h4>
            <p>Artists or labels with an active subscription membership agree to the following:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>MALPINOHDISTRO collects 0% of earnings.</li>
              <li>Subscribed users receive 100% of all revenue generated from their distributed content.</li>
              <li>Subscription fees must be paid on time to maintain full access and royalty rights.</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-base mb-2">4. USER RESPONSIBILITIES</h3>
            <p>You agree that:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>All submitted content is original or you hold proper licenses and permissions.</li>
              <li>Your uploads do not infringe on any copyrights, trademarks, or intellectual property rights.</li>
              <li>You will provide accurate metadata (credits, producer info, publishing info, etc.).</li>
              <li>You will not upload any illegal, hateful, abusive, or fraudulent content.</li>
            </ul>
            <p className="mt-2">
              MALPINOHDISTRO reserves the right to remove or suspend any content that violates these rules.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-base mb-2">5. PAYMENTS</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>Payments will be made monthly to your chosen payout method.</li>
              <li>You are responsible for providing accurate payment information.</li>
              <li>MALPINOHDISTRO is not liable for delays caused by incorrect payment details or third-party payment processors.</li>
              <li>Any fraudulent activity may result in withholding earnings and termination of your account.</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-base mb-2">6. TERMINATION</h3>
            <p>You may cancel your account at any time. Upon termination:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Your music may be removed from digital platforms.</li>
              <li>Any outstanding payments owed to you will still be processed.</li>
              <li>Subscription fees are non-refundable.</li>
            </ul>
            <p className="mt-2">
              MALPINOHDISTRO may suspend or terminate accounts for violating these Terms or engaging in fraudulent or abusive practices.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-base mb-2">7. LIMITATION OF LIABILITY</h3>
            <p>MALPINOHDISTRO is not liable for:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Loss of revenue caused by third-party stores or distributors.</li>
              <li>Technical issues, delays, or outages on partner platforms.</li>
              <li>Misuse of content by external platforms or users.</li>
            </ul>
            <p className="mt-2">
              You agree to hold MALPINOHDISTRO harmless against any claims related to your content.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-base mb-2">8. CHANGES TO TERMS</h3>
            <p>
              MALPINOHDISTRO reserves the right to update or change these Terms at any time. 
              Continued use of the platform constitutes acceptance of any updates.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-base mb-2">9. ACCEPTANCE</h3>
            <p>
              By uploading or distributing music through MALPINOHDISTRO, you acknowledge that you have read, 
              understood, and agree to be bound by these Terms & Conditions.
            </p>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
