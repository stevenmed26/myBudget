import { useBudgetData } from "./useBudgetData";
import { useCategories } from "./useCategories";
import { usePeriodClose } from "./usePeriodClose";
import { useProfile } from "./useProfile";
import { useRecurringRules } from "./useRecurringRules";
import { useTransactions } from "./useTransactions";

export function useAppData(enabled: boolean) {
  const data = useBudgetData(enabled);
  const { addExpense, editTransaction, removeTransaction } = useTransactions({
    categories: data.categories,
    reload: data.loadAll,
  });
  const { addCategory, removeCategory, saveBudget } = useCategories({
    reload: data.loadAll,
  });
  const { saveProfile } = useProfile({
    profile: data.profile,
    reload: data.loadAll,
  });
  const { saveRecurringRule, removeRecurringRule } = useRecurringRules({
    reload: data.loadAll,
  });
  const { closePeriod } = usePeriodClose({ reload: data.loadAll });

  return {
    ...data,
    addExpense,
    editTransaction,
    removeTransaction,
    addCategory,
    removeCategory,
    saveBudget,
    saveProfile,
    closePeriod,
    saveRecurringRule,
    removeRecurringRule,
  };
}
