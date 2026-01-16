'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getContractorExpenses,
  subscribeToContractorExpenses,
  getContractorExpenseStats,
} from '@/lib/firebase/expenses';
import { Expense, ExpenseCategory } from '@/types/expense';

interface UseContractorExpensesOptions {
  contractorId: string;
  realtime?: boolean;
  startDate?: Date;
  endDate?: Date;
}

interface UseContractorExpensesReturn {
  expenses: Expense[];
  loading: boolean;
  error: string | null;
  stats: {
    totalExpenses: number;
    expensesByCategory: Record<string, number>;
    expenseCount: number;
  };
  categoryFilter: ExpenseCategory | undefined;
  setCategoryFilter: (category: ExpenseCategory | undefined) => void;
  refetch: () => Promise<void>;
}

export function useContractorExpenses(
  options: UseContractorExpensesOptions
): UseContractorExpensesReturn {
  const { contractorId, realtime = false, startDate, endDate } = options;

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<ExpenseCategory | undefined>();
  const [stats, setStats] = useState({
    totalExpenses: 0,
    expensesByCategory: {} as Record<string, number>,
    expenseCount: 0,
  });

  const fetchData = useCallback(async () => {
    if (!contractorId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [expenseData, statsData] = await Promise.all([
        getContractorExpenses(contractorId),
        getContractorExpenseStats(contractorId, startDate, endDate),
      ]);

      // Apply date filtering client-side
      let filteredExpenses = expenseData;
      if (startDate || endDate) {
        filteredExpenses = expenseData.filter((expense) => {
          const expenseDate = expense.date.toMillis();
          if (startDate && expenseDate < startDate.getTime()) return false;
          if (endDate && expenseDate > endDate.getTime()) return false;
          return true;
        });
      }

      setExpenses(filteredExpenses);
      setStats(statsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch expenses');
    } finally {
      setLoading(false);
    }
  }, [contractorId, startDate, endDate]);

  useEffect(() => {
    if (!contractorId) {
      setLoading(false);
      return;
    }

    if (realtime) {
      setLoading(true);

      const unsubscribe = subscribeToContractorExpenses(contractorId, (data) => {
        // Apply date filtering
        let filteredExpenses = data;
        if (startDate || endDate) {
          filteredExpenses = data.filter((expense) => {
            const expenseDate = expense.date.toMillis();
            if (startDate && expenseDate < startDate.getTime()) return false;
            if (endDate && expenseDate > endDate.getTime()) return false;
            return true;
          });
        }

        setExpenses(filteredExpenses);
        setLoading(false);

        // Calculate stats from received data
        const newStats = {
          totalExpenses: 0,
          expensesByCategory: {} as Record<string, number>,
          expenseCount: filteredExpenses.length,
        };

        filteredExpenses.forEach((expense) => {
          newStats.totalExpenses += expense.amount;
          newStats.expensesByCategory[expense.category] =
            (newStats.expensesByCategory[expense.category] || 0) + expense.amount;
        });

        setStats(newStats);
      });

      return unsubscribe;
    } else {
      fetchData();
    }
  }, [contractorId, realtime, startDate, endDate, fetchData]);

  // Filter expenses by category if filter is set
  const filteredExpenses = categoryFilter
    ? expenses.filter((exp) => exp.category === categoryFilter)
    : expenses;

  return {
    expenses: filteredExpenses,
    loading,
    error,
    stats,
    categoryFilter,
    setCategoryFilter,
    refetch: fetchData,
  };
}
