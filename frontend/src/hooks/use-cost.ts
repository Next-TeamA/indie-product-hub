import useSWR from "swr";
import { getCostLedger, type CostLedgerResponse } from "@/lib/api/cost";

export function useCostLedger(projectId: string | null, days = 30) {
  const { data, error, isLoading, mutate } = useSWR<CostLedgerResponse>(
    projectId ? `cost-ledger/${projectId}/${days}` : null,
    () => getCostLedger(projectId!, days),
    { revalidateOnFocus: false },
  );
  return { cost: data, error, isLoading, mutate };
}
