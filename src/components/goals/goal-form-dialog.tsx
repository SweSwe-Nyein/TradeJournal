import React, { useState } from 'react';
import { Button } from '@/src/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/src/components/ui/dialog';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { GoalService } from '@/src/lib/services/goal-service';
import type { Goal } from '@/src/types/account';
import { useAuth } from '@/src/hooks/useAuth';

interface GoalFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onGoalUpdated: () => void;
  goal?: Goal;
}

export function GoalFormDialog({ isOpen, onClose, onGoalUpdated, goal }: GoalFormDialogProps) {
  const { user } = useAuth();
  const [name, setName] = useState(goal?.name || '');
  const [targetType, setTargetType] = useState<Goal['target_type']>(goal?.target_type || 'pnl');
  const [targetValue, setTargetValue] = useState(goal?.target_value.toString() || '');
  const [startDate, setStartDate] = useState(goal?.start_date || '');
  const [endDate, setEndDate] = useState(goal?.end_date || '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (goal) {
      await GoalService.updateGoal(user.id, goal.id, {
        name,
        target_type: targetType,
        target_value: Number(targetValue),
        start_date: startDate,
        end_date: endDate,
      });
    } else {
      await GoalService.createGoal(user.id, {
        name,
        target_type: targetType,
        target_value: Number(targetValue),
        current_value: 0,
        start_date: startDate,
        end_date: endDate,
      });
    }
    onGoalUpdated();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{goal ? 'Edit Goal' : 'Create Goal'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Goal Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Target Type</Label>
            <select value={targetType} onChange={(e) => setTargetType(e.target.value as Goal['target_type'])} className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-zinc-200">
              <option value="pnl">P&L</option>
              <option value="trade_count">Trade Count</option>
              <option value="win_rate">Win Rate</option>
              <option value="max_drawdown">Max Drawdown</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label>Target Value</Label>
            <Input type="number" value={targetValue} onChange={(e) => setTargetValue(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
            </div>
          </div>
          <Button type="submit" className="w-full">{goal ? 'Update' : 'Create'}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
