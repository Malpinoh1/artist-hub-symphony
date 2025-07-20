
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Music } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import AnimatedCard from '../components/AnimatedCard';
import ReleaseCard from '../components/ReleaseCard';
import { Button } from '@/components/ui/button';
import { supabase } from '../integrations/supabase/client';
import { fetchUserReleases, Release } from '../services/releaseService';
import { toast } from 'sonner';

const Releases = () => {
  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkAuthAndFetchReleases();
  }, []);

  const checkAuthAndFetchReleases = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      
      if (!session) {
        window.location.href = '/auth';
        return;
      }
      
      setUser(session.user);
      const userReleases = await fetchUserReleases(session.user.id);
      setReleases(userReleases);
    } catch (error) {
      console.error('Error fetching releases:', error);
      toast.error('Failed to load releases');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-muted/20 to-background">
        <Navbar />
        <main className="flex-grow pt-24 pb-16">
          <div className="container mx-auto px-4 py-8">
            <div className="text-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading your releases...</p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <Navbar />
      
      <main className="pt-24 pb-16">
        <section className="container mx-auto px-4 py-8 max-w-6xl">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-2">
                Your Releases
              </h1>
              <p className="text-muted-foreground text-lg">
                Manage and track all your music releases
              </p>
            </div>
            <Button asChild className="gap-2">
              <Link to="/release-form">
                <Plus className="w-4 h-4" />
                New Release
              </Link>
            </Button>
          </div>

          {releases.length === 0 ? (
            <AnimatedCard>
              <div className="text-center py-20">
                <Music className="w-16 h-16 mx-auto mb-6 text-muted-foreground/50" />
                <h2 className="text-2xl font-semibold mb-4 text-foreground">No releases yet</h2>
                <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                  Get started by uploading your first release and share your music with the world.
                </p>
                <Button asChild size="lg" className="gap-2">
                  <Link to="/release-form">
                    <Plus className="w-5 h-5" />
                    Upload Your First Release
                  </Link>
                </Button>
              </div>
            </AnimatedCard>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {releases.map((release, index) => (
                <AnimatedCard key={release.id} delay={index * 100}>
                  <ReleaseCard 
                    id={release.id}
                    title={release.title}
                    artist={release.artist}
                    coverArt={release.coverArt}
                    status={release.status}
                    releaseDate={release.releaseDate}
                    streamingLinks={release.streamingLinks}
                    upc={release.upc}
                    isrc={release.isrc}
                  />
                </AnimatedCard>
              ))}
            </div>
          )}
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default Releases;
