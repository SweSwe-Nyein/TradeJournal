import { useState } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/src/lib/supabase/client';
import type { ProfileUpdate } from '@/src/types/profile';

export function useProfile() {
  const { profile, user, refreshProfile, isConfigured } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const updateProfile = async (updates: ProfileUpdate): Promise<{ error: Error | null }> => {
    if (!user) return { error: new Error('User not authenticated') };

    setIsUpdating(true);
    setUpdateError(null);

    try {
      if (isConfigured) {
        const { error } = await (supabase as any)
          .from('profiles')
          .update({
            ...updates,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id);

        if (error) {
          const err = new Error(error.message);
          setUpdateError(error.message);
          return { error: err };
        }
      }

      await refreshProfile();
      return { error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update profile';
      setUpdateError(message);
      return { error: new Error(message) };
    } finally {
      setIsUpdating(false);
    }
  };

  return {
    profile,
    user,
    isUpdating,
    updateError,
    updateProfile,
  };
}
