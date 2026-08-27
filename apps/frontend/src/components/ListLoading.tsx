type ListBodyProps = {
  loading?: boolean;
  error?: boolean;
  empty?: boolean;
  loadingLabel: string;
  errorLabel: string;
  emptyLabel: string;
  children: React.ReactNode;
};

export function ListLoading({ label }: { label: string }) {
  return (
    <div className="list-loading" role="status" aria-live="polite" aria-busy="true">
      <div className="list-loading-mark" aria-hidden="true">
        <span className="list-loading-ring" />
      </div>
      <p className="list-loading-copy">{label}</p>
      <div className="list-loading-track" aria-hidden="true">
        <span className="list-loading-bar" />
      </div>
    </div>
  );
}

export function ListBody({ loading, error, empty, loadingLabel, errorLabel, emptyLabel, children }: ListBodyProps) {
  if (error) {
    return <div className="empty-state">{errorLabel}</div>;
  }
  if (loading) {
    return <ListLoading label={loadingLabel} />;
  }
  if (empty) {
    return <div className="empty-state">{emptyLabel}</div>;
  }
  return children;
}
