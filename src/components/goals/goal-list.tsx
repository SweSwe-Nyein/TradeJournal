import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { GoalService } from '@/src/lib/services/goal-service';
import type { Goal } from '@/src/types/account';
import { useAuth } from '@/src/hooks/useAuth';
import { GoalFormDialog } from './goal-form-dialog';
import { Plus, Trash2, Edit2 } from 'lucide-react';

export function GoalList() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | undefined>();

  const loadGoals = async () => {
    if (!user) return;
    const { data } = await GoalService.getGoals(user.id);
    setGoals(data || []);
  };

  useEffect(() => {
    loadGoals();
  }, [user]);

  const handleDelete = async (id: string) => {
    if (!user) return;
    await GoalService.deleteGoal(user.id, id);
    loadGoals();
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Trading Goals</CardTitle>
          <Button size="sm" onClick={() => { setEditingGoal(undefined); setIsDialogOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" /> New Goal
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {goals.map(goal => (
            <div key={goal.id} className="p-4 border border-zinc-800 rounded flex items-center justify-between">
              <div>
                <h3 className="font-medium text-zinc-100">{goal.name}</h3>
                <p className="text-sm text-zinc-400">{goal.target_type}: {goal.current_value} / {goal.target_value}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => { setEditingGoal(goal); setIsDialogOpen(true); }}>
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(goal.id)}>
                  <Trash2 className="w-4 h-4 text-rose-500" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      <GoalFormDialog 
        isOpen={isDialogOpen} 
        onClose={() => setIsDialogOpen(false)} 
        onGoalUpdated={loadGoals}
        goal={editingGoal}
      />
    </>
  );
}
