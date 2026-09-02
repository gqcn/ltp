import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { compareExperimentRuns } from "@/api/training";
import { Button } from "@/components/Button";
import { ListLoading } from "@/components/ListLoading";
import { ExperimentProgress, formatLoss, formatTokensPerSec } from "@/lib/experiment";
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
      <section className="page active" id="page-exp-compare">
        <div className="card">
          <div className="card-body empty-state exp-empty">
            <svg className="exp-empty-mark" viewBox="0 0 48 48" fill="none" aria-hidden="true">
              <rect x="6" y="12" width="18" height="26" rx="4" stroke="currentColor" strokeWidth="1.75" />
              <rect x="24" y="12" width="18" height="26" rx="4" stroke="currentColor" strokeWidth="1.75" />
              <path d="M10 20h10M10 26h7M28 20h10M28 26h7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <p>请至少选择 2 个实验</p>
            <p className="text-muted">在实验列表勾选 2 到 5 条，再进入对比。</p>
            <div className="exp-empty-actions">
              <Button onClick={() => navigate("/training/experiments")}>返回实验列表</Button>
            </div>
          </div>
        </div>
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
          <p className="desc">
            正在对比 {data.runs.length} 个实验 · 快照与超参 Diff
            {data.sameLocation ? " · 同机房可分别打开 TensorBoard" : " · 跨机房不叠加完整曲线"}
          </p>
        </div>
        <div className="page-actions">
          <Button variant="secondary" onClick={() => navigate("/training/experiments")}>返回列表</Button>
        </div>
      </div>
      <div className="exp-compare-runs">
        {data.runs.map((run) => (
          <button
            key={run.id}
            type="button"
            className="exp-compare-card"
            onClick={() => navigate(`/training/experiments/${run.id}`)}
          >
            <div className="exp-compare-card-head">
              <strong>{run.name}</strong>
              {run.jobStatus ? <JobStatusBadge status={run.jobStatus} /> : null}
            </div>
            <div className="exp-compare-card-meta text-muted">{run.projectName}</div>
            <div className="exp-compare-kpis">
              <div className="exp-compare-kpi">
                <span>Loss</span>
                <div className="mono">{formatLoss(run.loss)}</div>
              </div>
              <div className="exp-compare-kpi">
                <span>Step</span>
                <ExperimentProgress compact step={run.step} maxSteps={run.maxSteps} />
              </div>
              <div className="exp-compare-kpi">
                <span>吞吐</span>
                <div className="mono">{formatTokensPerSec(run.tokensPerSec)}</div>
              </div>
            </div>
          </button>
        ))}
      </div>
      {!data.sameLocation ? (
        <div className="exp-compare-note">所选实验不在同一集群机房，无法用同一个 TensorBoard 叠加完整曲线。下方只对比快照数字与超参。</div>
      ) : null}
      <div className="card">
        <div className="card-header"><h3>超参 Diff</h3></div>
        <div className="table-wrap">
          <table className="table exp-diff-table">
            <thead>
              <tr>
                <th>字段</th>
                {data.runs.map((run) => <th key={run.id} className="run-col">{run.name}</th>)}
              </tr>
            </thead>
            <tbody>
              {data.fields.map((field) => (
                <tr key={field.key} className={field.same ? undefined : "is-diff"}>
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
