
import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import AnimatedCard from '../components/AnimatedCard';

const TermsOfService = () => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />
      
      <main className="flex-grow pt-24 pb-16">
        <div className="container mx-auto px-4">
          <AnimatedCard>
            <div className="text-center mb-12">
              <h1 className="text-3xl md:text-4xl font-display font-semibold text-slate-900 mb-4">Terms of Service</h1>
              <p className="text-slate-600 max-w-2xl mx-auto">
                Last updated: May 1, 2025
              </p>
            </div>
          </AnimatedCard>
          
          <AnimatedCard>
            <div className="glass-panel p-8 prose prose-slate max-w-none">
              <h2>1. Acceptance of Terms</h2>
              <p>
                By accessing or using Malpinoh Music Distribution services ("Services"), you agree to be bound by these 
                Terms of Service. If you do not agree to these terms, please do not use our Services.
              </p>
              
              <h2>2. Service Description</h2>
              <p>
                Malpinoh Music Distribution provides digital music distribution services to artists, allowing them to upload, 
                distribute, and monetize their music on various digital platforms.
              </p>
              
              <h2>3. Account Registration</h2>
              <p>
                To use our Services, you must create an account. You agree to provide accurate information and keep your 
                account details updated. You are responsible for maintaining the confidentiality of your password and all 
                activities under your account.
              </p>
              
              <h2>4. Subscription and Fees</h2>
              <p>
                Our Services are provided on a paid basis according to the pricing plans offered. You agree to pay all fees 
                associated with your selected plan. We may modify our fees with prior notice.
              </p>
              
              <h2>5. Content Submission</h2>
              <p>
                By uploading content to our platform, you:
              </p>
              <ul>
                <li>Represent that you have all necessary rights to the content</li>
                <li>Grant us non-exclusive rights to distribute your content</li>
                <li>Agree not to upload infringing, illegal, or inappropriate content</li>
              </ul>
              
              <h2>6. Rights and Ownership</h2>
              <p>
                You retain all ownership rights to your music. We do not claim ownership of your content. You grant us 
                the necessary licenses to provide our distribution services.
              </p>
              
              <h2>7. Royalties and Payments</h2>
              <p>
                We will collect and distribute royalties according to our payment terms. Payments are subject to minimum 
                threshold amounts and verification procedures.
              </p>
              
              <h2>8. Prohibited Activities</h2>
              <p>
                You agree not to:
              </p>
              <ul>
                <li>Upload content that infringes on others' rights</li>
                <li>Use our Services for illegal activities</li>
                <li>Attempt to interfere with or disrupt our Services</li>
                <li>Create multiple accounts for abusive purposes</li>
              </ul>
              
              <h2>9. Termination</h2>
              <p>
                We may suspend or terminate your account if you violate these terms. You may terminate your account at any 
                time, subject to any ongoing contractual obligations.
              </p>
              
              <h2>10. Disclaimers and Limitations</h2>
              <p>
                Our Services are provided "as is" without warranties. We are not responsible for third-party platforms' 
                actions. Our liability is limited to the amount you paid for our Services in the past 12 months.
              </p>
              
              <h2>11. Changes to Terms</h2>
              <p>
                We may modify these terms with prior notice. Continued use of our Services after changes constitutes 
                acceptance of the updated terms.
              </p>
              
              <h2>12. Governing Law</h2>
              <p>
                These terms are governed by the laws of Nigeria. Any disputes shall be resolved through arbitration 
                in Nigeria.
              </p>
              
              <h2>13. Contact Us</h2>
              <p>
                For questions about these Terms, contact us at 
                <a href="mailto:info@malpinohdistro.com" className="text-blue-600 hover:underline">info@malpinohdistro.com</a>.
              </p>
            </div>
          </AnimatedCard>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default TermsOfService;
