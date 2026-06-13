
import React from 'react';
import { Link } from 'react-router-dom';
import { Plus, Music } from 'lucide-react';
import AnimatedCard from '../components/AnimatedCard';
import ReleaseCard from '../components/ReleaseCard';
import { Button } from '@/components/ui/button';
import { useAuth } from '../contexts/AuthContext';
import { useReleasesData } from '../hooks/useReleasesData';
import { useTeamPermissions } from '../hooks/useTeamPermissions';
import SubscriptionGate from '../components/SubscriptionGate';

const ReleasesContent = () => {
  const { user } = useAuth();
  const { getEffectiveAccountId, canManage, isLoading: permissionsLoading } = useTeamPermissions();

  const effectiveAccountId = getEffectiveAccountId() || user?.id;
  const { data: releases = [], isLoading: releasesLoading, refetch } = useReleasesData(effectiveAccountId);

  const loading = releasesLoading || permissionsLoading;

  if (loading) {
    return (
      <div className="text-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading your releases...</p>
      </div>
    );
  }

  return (
    <div>
      <section className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-6xl">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6 sm:mb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-foreground mb-1 sm:mb-2">
                Your Releases
              </h1>
              <p className="text-muted-foreground text-sm sm:text-lg">
                Manage and track all your music releases
              </p>
            </div>
            {canManage && (
              <Button asChild className="gap-2 w-full sm:w-auto min-h-[44px]">
                <Link to="/new-release">  
                  <Plus className="w-4 h-4" />
                  New Release
                </Link>
              </Button>
            )}
          </div>

          {releases.length === 0 ? (
            <AnimatedCard>
              <div className="text-center py-20">
                <Music className="w-16 h-16 mx-auto mb-6 text-muted-foreground/50" />
                <h2 className="text-2xl font-semibold mb-4 text-foreground">No releases yet</h2>
                <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                  {canManage 
                    ? "Get started by uploading your first release and share your music with the world."
                    : "No releases available for this account yet."
                  }
                </p>
                {canManage && (
                  <Button asChild size="lg" className="gap-2">
                    <Link to="/new-release">
                      <Plus className="w-5 h-5" />
                      Upload Your First Release
                    </Link>
                  </Button>
                )}
              </div>
            </AnimatedCard>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {releases.map((release, index) => (
                <AnimatedCard key={release.id} delay={index * 100}>
                  <ReleaseCard 
                    release={release}
                    onUpdate={() => refetch()}
                  />
                </AnimatedCard>
              ))}
            </div>
          )}
      </section>
    </div>
  );
};

const Releases = () => {
  return (
    <SubscriptionGate fallbackMessage="You don't have permission to view releases on this account.">
      <ReleasesContent />
    </SubscriptionGate>
  );
};

export default Releases;
