'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, Dispatch, SetStateAction } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

interface Opportunity {
  id: string;
  [key: string]: any;
}

interface SavedOpportunitiesContextType {
  saved: Opportunity[];
  setSaved: Dispatch<SetStateAction<Opportunity[]>>;
  toggleSave: (opportunity: Opportunity) => void;
  loading: boolean;
}

const SavedOpportunitiesContext = createContext<SavedOpportunitiesContextType | undefined>(undefined);

export const SavedOpportunitiesProvider = ({ children }: { children: ReactNode }) => {
  const [saved, setSaved] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  // Load saved opportunities from Supabase
  useEffect(() => {
    if (!user) {
      setSaved([]);
      setLoading(false);
      return;
    }

    const fetchSaved = async () => {
      try {
        const { data, error } = await supabase
          .from('saved_opportunities')
          .select('opportunity_id, opportunities(*)')
          .eq('user_id', user.id);

        if (!error && data) {
          const opportunities: Opportunity[] = data
            .filter((item: any) => item.opportunities)
            .map((item: any) => ({
              id: item.opportunity_id,
              ...item.opportunities,
            }));
          setSaved(opportunities);
        }
      } catch (error) {
        console.error('Error loading saved opportunities:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSaved();

    // Subscribe to realtime changes
    const channel = supabase
      .channel(`saved-opportunities-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'saved_opportunities',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchSaved();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const toggleSave = async (opportunity: Opportunity) => {
    if (!user) return;

    const isSaved = saved.some(item => item.id === opportunity.id);

    try {
      if (isSaved) {
        // Remove from saved
        const { error } = await supabase
          .from('saved_opportunities')
          .delete()
          .eq('user_id', user.id)
          .eq('opportunity_id', opportunity.id);
        if (error) throw error;
      } else {
        // Add to saved
        const { error } = await supabase
          .from('saved_opportunities')
          .insert({
            user_id: user.id,
            opportunity_id: opportunity.id,
          });
        if (error) throw error;
      }
    } catch (error) {
      console.error('Error toggling save:', error);
    }
  };

  return (
    <SavedOpportunitiesContext.Provider value={{ saved, setSaved, toggleSave, loading }}>
      {children}
    </SavedOpportunitiesContext.Provider>
  );
};

export const useSavedOpportunities = () => {
  const context = useContext(SavedOpportunitiesContext);
  if (context === undefined) {
    throw new Error('useSavedOpportunities must be used within a SavedOpportunitiesProvider');
  }
  return context;
};
