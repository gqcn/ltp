import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { compareExperimentRuns } from "@/api/training";
import { Button } from "@/components/Button";
import { ListLoading } from "@/components/ListLoading";
import { JobStatusBadge } from "@/lib/job";

export function ExperimentComparePage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const ids = useMemo(
    () => (params.get("ids") || "").split(",").map((x) => Number(x)).filter((n) => n > 0).slice(0, 5),
    [params],
  );
  const query = useQuery({
    queryKey: ["exp-compare", ids],
    queryFn: () => compareExperimentRuns(ids),
    enabled: ids.length >= 2,
  });
  if (ids.length < 2) {
    return (
      <section className="page active">
        <div className="card"><div className="card-body empty-state" style={{ padding: 48 }}>请至少选择 2 个实验。<div style={{ marginTop: 16 }}><Button onClick={() => navigate("/training/experiments")}>返回实验列表</Button></div></div></div>
      </section>
    );
  }
  if (query.isLoading) {
    return <div className="card" style={{ margin: 24 }}><ListLoading label="正在对比实验…" /></div>;
  }
  const data = query.data;
  if (!data) {
    return <section className="page active"><div className="empty-state">对比失败</div></section>;
  }
  return (
    <section className="page active" id="page-exp-compare">
      <div className="page-header">
        <div>
          <h1>实验对比</h1>
          <p className="desc">正在对比 {data.runs.length} 个实验 · 快照与超参 Diff{data.sameLocation ? " · 同机房可打开 TensorBoard" : " · 跨机房不叠加完整曲线"}</p>
        </div>
        <div className="page-actions">
          <Button variant="secondary" onClick={() => navigate("/training/experiments")}>返回列表</Button>
        </div>
      </div>
      <div className="exp-compare-runs">
        {data.runs.map((run) => (
          <div key={run.id} className="exp-compare-chip">
            <strong>{run.name}</strong>
            {run.jobStatus ? <JobStatusBadge status={run.jobStatus} /> : null}
            <span className="mono text-muted">loss {run.loss ?? "—"} · step {run.step ?? "—"}</span>
          </div>
        ))}
      </div>
      {!data.sameLocation ? <p className="text-muted">所选实验不在同一集群机房，无法用同一个 TensorBoard 叠加完整曲线。</p> : null}
      <div className="card">
        <div className="card-header"><h3>超参 Diff</h3></div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>字段</th>
                {data.runs.map((run) => <th key={run.id}>{run.name}</th>)}
              </tr>
            </thead>
            <tbody>
              {data.fields.map((field) => (
                <tr key={field.key}>
                  <td className="mono">{field.key}</td>
                  {field.values.map((v, i) => <td key={i} className={`mono ${field.same ? "diff-same" : "diff-diff"}`}>{v || "—"}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
