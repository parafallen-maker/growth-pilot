import { PageHeader, SummaryPanel, TabStrip, TimelinePanel } from '@/components/business/page-blocks';
import { teacherService } from '@/services/teachers-service';

export default async function TeacherDetailPage({ params }: { params: Promise<{ teacherId: string }> }) {
  const { teacherId } = await params;
  const detail = await teacherService.detail(teacherId);

  return (
    <div className="stack">
      <PageHeader
        title={`教师详情 · ${detail.teacher.name}`}
        description={`${detail.teacher.employeeNo} / ${detail.teacher.campusId} / ${detail.teacher.leadSubject ?? '未配置主学科'} / 状态 ${detail.teacher.status}`}
        actions={<><button className="btn primary">编辑档案</button><button className="btn">新增发展记录</button><button className="btn">新增班次</button></>}
      />
      <TabStrip tabs={['基础档案', '学科能力', '班次/值班', '带学生列表', '发展记录']} active="基础档案" />
      <div className="grid-2">
        <SummaryPanel
          title="档案摘要"
          items={[
            { name: '基础档案', detail: `${detail.teacher.employeeNo} / ${detail.teacher.name}` },
            { name: '联系方式', detail: detail.teacher.mobile ?? '未配置手机号' },
            { name: '主学科', detail: detail.teacher.leadSubject ?? '未配置' },
            { name: '校区', detail: detail.teacher.campusId },
          ]}
        />
        <TimelinePanel
          title="发展记录 / 带学生"
          items={[
            ...detail.developmentRecords.map((item) => ({ title: `${item.recordType} · ${item.title}`, detail: `${item.occurredAt} / ${item.status}` })),
            ...detail.subjects.map((item) => ({ title: `学科能力 · ${item.subject}`, detail: `${item.gradeRange ?? '--'} / ${item.level ?? '--'}` })),
            ...detail.shifts.map((item) => ({ title: `班次 ${item.id}`, detail: `周${item.weekday} ${item.startTime}-${item.endTime} / ${item.shiftType}` })),
          ]}
        />
      </div>
    </div>
  );
}
