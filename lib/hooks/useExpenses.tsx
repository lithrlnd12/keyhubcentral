'use client';

import { useState, useEffect, useCallback } from 'react';
import { Expense, ExpenseCategory, ExpenseEntity } from '@/types/expense';
import {
  getExpenses,
  subscribeToExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  ExpenseFilters,
} from '@/lib/firebase/expenses';

interface UseExpensesOptions {
  entity?: ExpenseEntity;
  category?: ExpenseCategory;
  startDate?: Date;
  endDate?: Date;
  realtime?: boolean;
}

export function useExpenses(options: UseExpensesOptions = {}) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ExpenseFilters>({
    entity: options.entity,
    category: options.category,
    startDate: options.startDate,
    endDate: options.endDate,
  });

  useEffect(() => {
    setLoading(true);
    setError(null);

    if (options.realtime) {
      const unsubscribe = subscribeToExpenses((data) => {
        setExpenses(data);
        setLoading(false);
      }, filters, (err) => {
        console.error('useExpenses subscription error:', err);
        setError('Failed to load expenses');
        setLoading(false);
      });

      return () => unsubscribe();
    } else {
      getExpenses(filters)
        .then((data) => {
          setExpenses(data);
          setLoading(false);
        })
        .catch((err) => {
          console.error('Error fetching expenses:', err);
          setError('Failed to load expenses');
          setLoading(false);
        });
    }
  }, [options.realtime, filters]);

  const setEntity = useCallback((entity?: ExpenseEntity) => {
    setFilters((prev) => ({ ...prev, entity }));
  }, []);

  const setCategory = useCallback((category?: ExpenseCategory) => {
    setFilters((prev) => ({ ...prev, category }));
  }, []);

  const setDateRange = useCallback((startDate?: Date, endDate?: Date) => {
    setFilters((prev) => ({ ...prev, startDate, endDate }));
  }, []);

  return {
    expenses,
    loading,
    error,
    filters,
    setEntity,
    setCategory,
    setDateRange,
  };
}

export function useExpenseMutations() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = useCallback(
    async (data: Omit<Expense, 'id' | 'createdAt'>) => {
      setLoading(true);
      setError(null);
      try {
        const id = await createExpense(data);
        return id;
      } catch (err) {
        console.error('Error creating expense:', err);
        setError('Failed to create expense');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const update = useCallback(
    async (id: string, data: Partial<Omit<Expense, 'id' | 'createdAt'>>) => {
      setLoading(true);
      setError(null);
      try {
        await updateExpense(id, data);
      } catch (err) {
        console.error('Error updating expense:', err);
        setError('Failed to update expense');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const remove = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await deleteExpense(id);
    } catch (err) {
      console.error('Error deleting expense:', err);
      setError('Failed to delete expense');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    createExpense: create,
    updateExpense: update,
    deleteExpense: remove,
    loading,
    error,
  };
}
