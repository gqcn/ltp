import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listClusters, type Cluster } from "@/api/cluster";
import { pickWorkingClusterId, readWorkingClusterId, writeWorkingClusterId } from "./cluster";

export function useWorkingCluster() {
  const listQuery = useQuery({
    queryKey: ["clusters", "working"],
    queryFn: () => listClusters({ pageNum: 1, pageSize: 100 }),
  });
  const clusters = listQuery.data?.list ?? [];
  const [clusterId, setClusterId] = useState<number | null>(readWorkingClusterId);

  useEffect(() => {
    const next = pickWorkingClusterId(
      clusters.map((c) => c.id),
      clusterId,
    );
    if (next !== clusterId) {
      setClusterId(next);
      if (next) {
        writeWorkingClusterId(next);
      }
    }
  }, [clusters, clusterId]);

  function select(id: number) {
    setClusterId(id);
    writeWorkingClusterId(id);
  }

  const current: Cluster | undefined = clusters.find((c) => c.id === clusterId);
  return { clusters, clusterId, current, select, loading: listQuery.isLoading, error: listQuery.isError };
}
