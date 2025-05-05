
import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import AnimatedCard from '../components/AnimatedCard';

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />
      
      <main className="flex-grow pt-24 pb-16">
        <div className="container mx-auto px-4">
          <AnimatedCard>
            <div className="text-center mb-12">
              <h1 className="text-3xl md:text-4xl font-display font-semibold text-slate-900 mb-4">Privacy Policy</h1>
              <p className="text-slate-600 max-w-2xl mx-auto">
                Last updated: May 1, 2025
              </p>
            </div>
          </AnimatedCard>
          
          <AnimatedCard>
            <div className="glass-panel p-8 prose prose-slate max-w-none">
              <h2>1. Introduction</h2>
              <p>
                Malpinoh Music Distribution ("we", "our", or "us") is committed to protecting your privacy. 
                This Privacy Policy explains how we collect, use, and share your personal information when you use 
                our website and services.
              </p>
              
              <h2>2. Information We Collect</h2>
              <p>We collect information in the following ways:</p>
              <ul>
                <li>
                  <strong>Account Information:</strong> When you register for an account, we collect your name, email address, 
                  password, and other information you provide.
                </li>
                <li>
                  <strong>Music Content:</strong> We collect the music content, artwork, and metadata you upload to our platform.
                </li>
                <li>
                  <strong>Payment Information:</strong> When you make payments, we collect payment method details, billing address, 
                  and transaction information.
                </li>
                <li>
                  <strong>Usage Information:</strong> We collect information about how you interact with our platform, including 
                  your IP address, device information, browser type, and pages visited.
                </li>
              </ul>
              
              <h2>3. How We Use Your Information</h2>
              <p>We use your information for the following purposes:</p>
              <ul>
                <li>To provide and maintain our services</li>
                <li>To distribute your music to digital platforms</li>
                <li>To process payments and manage your account</li>
                <li>To track your music's performance and royalties</li>
                <li>To communicate with you regarding our services</li>
                <li>To improve and develop our platform</li>
                <li>To comply with legal obligations</li>
              </ul>
              
              <h2>4. Sharing Your Information</h2>
              <p>
                We share your information with third parties in the following circumstances:
              </p>
              <ul>
                <li>With digital music platforms for music distribution</li>
                <li>With payment processors for payment processing</li>
                <li>With service providers who help us deliver our services</li>
                <li>With legal authorities when required by law</li>
              </ul>
              
              <h2>5. Your Rights and Choices</h2>
              <p>
                You have certain rights regarding your personal information, including:
              </p>
              <ul>
                <li>Accessing, updating, or deleting your information</li>
                <li>Opting out of marketing communications</li>
                <li>Requesting a copy of your data</li>
              </ul>
              
              <h2>6. Data Security</h2>
              <p>
                We implement reasonable security measures to protect your information from unauthorized access, 
                alteration, or destruction. However, no method of transmission over the Internet or electronic 
                storage is 100% secure.
              </p>
              
              <h2>7. International Data Transfers</h2>
              <p>
                Your information may be transferred to and processed in countries other than your country of residence. 
                We ensure appropriate safeguards are in place to protect your information.
              </p>
              
              <h2>8. Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. We will notify you of any changes by posting 
                the updated policy on our website.
              </p>
              
              <h2>9. Contact Us</h2>
              <p>
                If you have any questions or concerns about this Privacy Policy, please contact us at 
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

export default PrivacyPolicy;
