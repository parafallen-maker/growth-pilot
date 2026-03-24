import { PageHeader, SummaryPanel, TabStrip, TimelinePanel } from '@/components/business/page-blocks';
import { teacherService } from '@/services/teachers-service';

export default async function TeacherDetailPage({ params }: { params: Promise<{ teacherId: string }> }) {
  const { teacherId } = await params;
  const detail = teacherService.detail(teacherId);

  return (
    <div className="stack">
      <PageHeader
        title={`教师详情页骨架 · ${teacherId}`}
        description="P09 tabs、顶部动作和聚合位已预铺，后续直接接 A5 详情/发展记录接口。"
        actions={<><button className="btn primary">编辑档案</button><button className="btn">新增发展记录</button><button className="btn">新增班次</button></>}
      />
      <TabStrip tabs={['基础档案', '学科能力', '班次/值班', '带学生列表', '发展记录']} active="基础档案" />
      <div className="grid-2">
        <SummaryPanel title="档案摘要" items={detail.profile} />
        <TimelinePanel title="发展记录 / 带学生" items={detail.timeline} />
      </div>
    </div>
  );
}
