import { PageHeader, SummaryPanel, TimelinePanel } from '@/components/business/page-blocks';
import { familyService } from '@/services/families-service';

export default async function FamilyDetailPage({ params }: { params: Promise<{ familyId: string }> }) {
  const { familyId } = await params;
  const detail = familyService.detail(familyId);

  return (
    <div className="stack">
      <PageHeader
        title={`家庭详情页骨架 · ${familyId}`}
        description="P07 家庭摘要、监护人、关联学生、沟通时间线、会谈和任务入口都已经预铺。"
        actions={<><button className="btn primary">添加监护人</button><button className="btn">新建家庭任务</button><button className="btn">新建沟通记录</button><button className="btn">新建会谈</button></>}
      />
      <div className="grid-3">
        <SummaryPanel title="监护人列表" items={detail.guardians} />
        <SummaryPanel title="关联学生" items={detail.students} />
        <TimelinePanel title="家庭时间线 / 收费摘要" items={detail.timeline} />
      </div>
    </div>
  );
}
