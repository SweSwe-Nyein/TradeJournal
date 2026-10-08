import { supabase } from '@/src/lib/supabase/client';
import type { Goal, GoalInsert, GoalUpdate } from '@/src/types/account';

export class GoalService {
  public static async getGoals(userId: string): Promise<{ data: Goal[]; error: Error | null }> {
    const { data, error } = await (supabase as any)
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) return { data: [], error: new Error(error.message) };
    return { data: data as Goal[], error: null };
  }

  public static async createGoal(userId: string, goalData: Omit<GoalInsert, 'user_id'>): Promise<{ data: Goal | null; error: Error | null }> {
    const { data, error } = await (supabase as any)
      .from('goals')
      .insert({ ...goalData, user_id: userId })
      .select()
      .single();

    if (error) return { data: null, error: new Error(error.message) };
    return { data: data as Goal, error: null };
  }

  public static async updateGoal(userId: string, goalId: string, updates: GoalUpdate): Promise<{ data: Goal | null; error: Error | null }> {
    const { data, error } = await (supabase as any)
      .from('goals')
      .update(updates)
      .eq('id', goalId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) return { data: null, error: new Error(error.message) };
    return { data: data as Goal, error: null };
  }

  public static async deleteGoal(userId: string, goalId: string): Promise<{ success: boolean; error: Error | null }> {
    const { error } = await (supabase as any)
      .from('goals')
      .delete()
      .eq('id', goalId)
      .eq('user_id', userId);

    if (error) return { success: false, error: new Error(error.message) };
    return { success: true, error: null };
  }
}
