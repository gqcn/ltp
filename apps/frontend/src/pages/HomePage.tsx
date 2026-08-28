export function HomePage() {
  return (
    <section className="page active">
      <div className="page-header">
        <div>
          <h1>暂无可用模块</h1>
          <p className="desc">当前账号可见的菜单分区尚未启用。请联系管理员调整角色。</p>
        </div>
      </div>
      <div className="card">
        <div className="card-body">
          <div className="empty-state">当前没有可访问的已启用模块</div>
        </div>
      </div>
    </section>
  );
}
