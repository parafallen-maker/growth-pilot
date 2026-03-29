import Link from 'next/link';
import { PageHeader, SummaryPanel, TabStrip, TimelinePanel } from '@/components/business/page-blocks';
import type { PageResult } from '@/features/shared/types';
import { serverApiRequest } from '@/lib/server-api';
import { teacherService } from '@/services/teachers-service';
import { PageBreadcrumbs } from '../../_components/page-breadcrumbs';

const tabs = [
  { label: '基础档案', value: 'profile' },
  { label: '学科能力', value: 'subjects' },
  { label: '班次/值班', value: 'shifts' },
  { label: '带学生列表', value: 'students' },
  { label: '发展记录', value: 'development' },
];

function formatDateTime(value?: string | null) {
  return value ? value.replace('T', ' ').slice(0, 16) : '--';
}

function panelForTab(tab: string, detail: Awaited<ReturnType<typeof teacherService.detail>>, students: Array<{ id: string; studentNo: string; name: string; gradeLabel: string; status: string }>) {
  if (tab === 'subjects') {
    return (
      <SummaryPanel
        title="学科能力"
        items={detail.subjects.length
          ? detail.subjects.map((item, index) => ({ name: item.subject || `学科 ${index + 1}`, detail: `${item.gradeRange ?? '未配置学段'} / 评级 ${item.level ?? '--'}` }))
          : [{ name: '暂无学科能力', detail: '当前后端未返回学科能力条目。' }]}
      />
    );
  }

  if (tab === 'shifts') {
    return (
      <TimelinePanel
        title="班次 / 值班安排"
        items={detail.shifts.length
          ? detail.shifts.map((item) => ({ title: `${item.shiftType} / 周${item.weekday}`, detail: `${item.startTime}-${item.endTime} / 班次 ${item.id}` }))
          : [{ title: '暂无班次安排', detail: '当前教师还没有排班记录。' }]}
      />
    );
  }

  if (tab === 'students') {
    return (
      <SummaryPanel
        title="带学生列表"
        items={students.length
          ? students.map((student) => ({ name: `${student.name} / ${student.studentNo}`, detail: `${student.gradeLabel} / ${student.status}` }))
          : [{ name: '暂无在带学生', detail: '当前后端未返回 teacherId 关联学生。' }]}
      />
    );
  }

  if (tab === 'development') {
    return (
      <TimelinePanel
        title="发展记录"
        items={detail.developmentRecords.length
          ? detail.developmentRecords.map((item) => ({ title: `${item.recordType} · ${item.title}`, detail: `${formatDateTime(item.occurredAt)} / ${item.status}` }))
          : [{ title: '暂无发展记录', detail: '可通过教师发展记录接口继续补充。' }]}
      />
    );
  }

  return (
    <SummaryPanel
      title="档案摘要"
      items={[
        { name: '基础档案', detail: `${detail.teacher.employeeNo} / ${detail.teacher.name}` },
        { name: '联系方式', detail: detail.teacher.mobile ?? '未配置手机号' },
        { name: '主学科', detail: detail.teacher.leadSubject ?? '未配置' },
        { name: '校区', detail: detail.teacher.campusId },
        { name: '员工编号', detail: detail.teacher.employeeNo },
        { name: '状态', detail: detail.teacher.status },
      ]}
    />
  );
}

export default async function TeacherDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ teacherId: string }>;
  searchParams?: Promise<{ tab?: string }>;
}) {
  const { teacherId } = await params;
  const query = await searchParams;
  const activeTab = tabs.some((item) => item.value === query?.tab) ? query?.tab ?? 'profile' : 'profile';

  const [detail, studentResult] = await Promise.all([
    teacherService.detail(teacherId),
    serverApiRequest<PageResult<{ id: string; studentNo: string; name: string; gradeLabel: string; status: string }>>(`/students?pageNo=1&pageSize=100&teacherId=${teacherId}`).catch(() => ({
      list: [],
      page: { pageNo: 1, pageSize: 100, total: 0 },
    })),
  ]);

  return (
    <div className="stack">
      <PageBreadcrumbs items={[{ label: '教师列表', href: '/teachers' }, { label: detail.teacher.name }]} />
      <PageHeader
        title={`教师详情 · ${detail.teacher.name}`}
        description={`${detail.teacher.employeeNo} / ${detail.teacher.campusId} / ${detail.teacher.leadSubject ?? '未配置主学科'} / 状态 ${detail.teacher.status}`}
        actions={<><Link className="btn primary" href="/teachers">返回教师列表</Link><Link className="btn" href={`/teachers/${teacherId}?tab=development`}>查看发展记录</Link><Link className="btn" href={`/teachers/${teacherId}?tab=shifts`}>查看班次</Link></>}
      />
      <TabStrip tabs={tabs} active={activeTab} baseUrl={`/teachers/${teacherId}`} />
      <div className="grid-2">
        {panelForTab(activeTab, detail, studentResult.list)}
        <TimelinePanel
          title="教师全景"
          items={[
            { title: '学科能力', detail: detail.subjects.length ? `${detail.subjects.length} 个能力条目` : '暂无配置' },
            { title: '班次安排', detail: detail.shifts.length ? `${detail.shifts.length} 条排班` : '暂无排班' },
            { title: '带学生', detail: studentResult.list.length ? `${studentResult.list.length} 位学生` : '暂无关联学生' },
            { title: '最近发展记录', detail: detail.developmentRecords[0] ? `${detail.developmentRecords[0].title} / ${formatDateTime(detail.developmentRecords[0].occurredAt)}` : '暂无发展记录' },
          ]}
        />
      </div>
    </div>
  );
}
