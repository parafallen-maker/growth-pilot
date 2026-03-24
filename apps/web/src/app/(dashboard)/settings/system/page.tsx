import { PermissionGuard } from '@/components/business/permission-guard';
import { PageHeader, SummaryPanel, TabStrip, TimelinePanel } from '@/components/business/page-blocks';
import { mockCurrentUser } from '@/lib/navigation';
import { queryKeys } from '@/features/shared/query-keys';
import { settingsService } from '@/services/settings-service';

export default function SettingsSystemPage() {
  const detail = settingsService.detail();

  return (
    <PermissionGuard allowed={mockCurrentUser.permissions.includes('settings:view')}>
      <div className="stack">
        <PageHeader
          title="系统设置页面骨架"
          description={`P30 已预铺：校区、学期、字典、AI 任务中心。jobId 基线与 pageNo/pageSize 查询口径已对齐。示例 key: ${JSON.stringify(queryKeys.jobs({ pageNo: 1, pageSize: 20 }))}`}
          actions={<><button className="btn primary">创建校区</button><button className="btn">创建学期</button><button className="btn">查看失败任务</button></>}
        />
        <TabStrip tabs={['校区', '学期', '字典', 'AI 任务中心']} active="校区" />
        <div className="grid-2">
          <SummaryPanel title="校区" items={detail.campuses} />
          <SummaryPanel title="学期" items={detail.terms} />
        </div>
        <div className="grid-2">
          <SummaryPanel title="字典" items={detail.dictionaries} />
          <TimelinePanel title="AI 任务中心" items={detail.jobs.map((job) => ({ title: job.name, detail: job.detail }))} />
        </div>
      </div>
    </PermissionGuard>
  );
}
