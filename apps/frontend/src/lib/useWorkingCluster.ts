import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listClusters, type Cluster } from "@/api/cluster";
import { listTrainingClusters } from "@/api/training";
import { pickWorkingClusterId, readWorkingClusterId, writeWorkingClusterId } from "./cluster";

const workingClusterIdKey = ["working-cluster-id"] as const;

export function useWorkingCluster(source: "ops" | "training" = "ops") {
  const queryClient = useQueryClient();
  const listQuery = useQuery({
    queryKey: ["clusters", "working", source],
    queryFn: async () => {
      if (source === "training") {
        const data = await listTrainingClusters();
        return { list: data.list.map((item) => ({ id: item.id, displayName: item.displayName, status: item.status }) as Cluster) };
      }
      return listClusters({ pageNum: 1, pageSize: 100 });
    },
  });
  const clusters = listQuery.data?.list ?? [];
  const idQuery = useQuery({
    queryKey: workingClusterIdKey,
    queryFn: () => readWorkingClusterId(),
    initialData: () => readWorkingClusterId(),
    staleTime: Infinity,
  });
  const clusterId = idQuery.data ?? null;

  useEffect(() => {
    if (!listQuery.isFetched) {
      return;
    }
    const next = pickWorkingClusterId(
      clusters.map((c) => c.id),
      clusterId,
    );
    if (next !== clusterId) {
      if (next) {
        writeWorkingClusterId(next);
      }
      queryClient.setQueryData(workingClusterIdKey, next);
    }
  }, [clusters, clusterId, listQuery.isFetched, queryClient]);

  function select(id: number) {
    writeWorkingClusterId(id);
    queryClient.setQueryData(workingClusterIdKey, id);
  }

  const current: Cluster | undefined = clusters.find((c) => c.id === clusterId);
  return { clusters, clusterId, current, select, loading: listQuery.isLoading, error: listQuery.isError };
}
