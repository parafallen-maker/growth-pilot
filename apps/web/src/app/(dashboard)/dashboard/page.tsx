import { MetricGrid, PageHeader, StateBlock, SummaryPanel, TimelinePanel } from '@/components/business/page-blocks';
import { dashboardService } from '@/services/dashboard-service';

export default function DashboardPage() {
  const data = dashboardService.query({ campusId: 'campus-guiyang', termId: '2026-spring' });

  return (
    <div className="stack">
      <PageHeader
        title="Dashboard 总览占位页"
        description="P02 页面骨架已就位：KPI、待复核看板、成长执行、收费提醒、快捷入口都留了坑位。"
        actions={<><button className="btn primary">切学期</button><button className="btn">导出截图（占位）</button></>}
      />
      <MetricGrid items={data.metrics} />
      <div className="grid-2">
        <SummaryPanel title="作业待复核看板" items={[{ name: '高优先级队列', detail: '8 条 > 48h 未处理' }, { name: '老师负载', detail: '周老师 8 / 吴老师 5 / 李老师 4' }]} />
        <SummaryPanel title="成长执行看板" items={[{ name: '本周观察覆盖', detail: '78% / 还有 19 名学生未覆盖' }, { name: '周报产出', detail: '草稿 21 / 待发布 11' }]} />
      </div>
      <div className="grid-2">
        <TimelinePanel title="收费提醒" items={[{ title: '林家', detail: '账单逾期 3 天 / 待服务跟进' }, { title: '陈家', detail: '本周需发续费提醒' }]} />
        <TimelinePanel title="快捷入口" items={[{ title: '新建学生', detail: '跳 students 新建表单（下一波接）' }, { title: '导入学生', detail: '跳 students/import 已有骨架' }]} />
      </div>
      <StateBlock state="loading" title="弱网 / 首屏加载统一态" />
    </div>
  );
}
