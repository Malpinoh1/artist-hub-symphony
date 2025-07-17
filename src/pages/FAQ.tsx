
import React from 'react';
import { Helmet } from 'react-helmet-async';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQ = () => {
  const faqs = [
    {
      question: "How does music distribution work?",
      answer: "We distribute your music to major streaming platforms like Spotify, Apple Music, Amazon Music, and many others. Once uploaded, your music typically appears on platforms within 24-48 hours."
    },
    {
      question: "What percentage of royalties do you take?",
      answer: "We keep our fees transparent and competitive. You keep 85% of all streaming royalties, while we retain 15% to cover distribution costs and platform maintenance."
    },
    {
      question: "How long does it take for my music to go live?",
      answer: "Most releases go live within 24-48 hours after approval. However, it can take up to 7 days during busy periods or if additional review is required."
    },
    {
      question: "Can I distribute covers or remixes?",
      answer: "Yes, but you must own the proper licenses. For covers, you'll need mechanical licenses. For remixes, you need permission from the original copyright holders."
    },
    {
      question: "What formats do you accept?",
      answer: "We accept high-quality audio files in WAV, FLAC, or high-bitrate MP3 format (320kbps minimum). Cover art should be at least 3000x3000 pixels in JPG or PNG format."
    },
    {
      question: "How do I get paid?",
      answer: "Payments are processed monthly via bank transfer or PayPal. You can request withdrawals once your earnings reach the minimum threshold of $20."
    },
    {
      question: "Can I remove my music from platforms?",
      answer: "Yes, you can request takedown of your releases at any time through your dashboard. The process typically takes 24-48 hours to complete across all platforms."
    },
    {
      question: "Do you provide analytics?",
      answer: "Yes! Your dashboard includes detailed analytics showing streams, revenue, geographic data, and platform performance to help you understand your audience."
    }
  ];

  return (
    <>
      <Helmet>
        <title>FAQ - MALPINOHdistro | Frequently Asked Questions</title>
        <meta name="description" content="Find answers to common questions about music distribution, royalties, and our services." />
      </Helmet>
      
      <div className="min-h-screen bg-background">
        <Navbar />
        
        <main className="pt-20 pb-16">
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="text-center mb-12 animate-fade-in">
              <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
                Frequently Asked Questions
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Everything you need to know about music distribution and our platform
              </p>
            </div>

            <div className="glass-panel p-6 md:p-8 animate-slide-up">
              <Accordion type="single" collapsible className="w-full">
                {faqs.map((faq, index) => (
                  <AccordionItem key={index} value={`item-${index}`}>
                    <AccordionTrigger className="text-left text-lg font-medium">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground leading-relaxed">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>

            <div className="text-center mt-12 glass-panel p-6 animate-scale-in">
              <h2 className="text-2xl font-semibold mb-4">Still have questions?</h2>
              <p className="text-muted-foreground mb-6">
                Can't find what you're looking for? Our support team is here to help.
              </p>
              <a 
                href="/contact" 
                className="btn-primary px-8 py-3 text-lg"
              >
                Contact Support
              </a>
            </div>
          </div>
        </main>
        
        <Footer />
      </div>
    </>
  );
};

export default FAQ;
