import Link from 'next/link';
import { PageHeader, SummaryPanel, TabStrip, TimelinePanel } from '@/components/business/page-blocks';
import { communicationService } from '@/services/communication-service';
import { familyService } from '@/services/families-service';
import { tasksService } from '@/services/tasks-service';
import { PageBreadcrumbs } from '../../_components/page-breadcrumbs';

const tabs = [
  { label: '家庭档案', value: 'profile' },
  { label: '监护人与学生', value: 'members' },
  { label: '家庭任务', value: 'tasks' },
  { label: '沟通记录', value: 'communications' },
];

function formatDateTime(value?: string | null) {
  return value ? value.replace('T', ' ').slice(0, 16) : '--';
}

export default async function FamilyDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ familyId: string }>;
  searchParams?: Promise<{ tab?: string }>;
}) {
  const { familyId } = await params;
  const query = await searchParams;
  const activeTab = tabs.some((item) => item.value === query?.tab) ? query?.tab ?? 'profile' : 'profile';

  const [detail, familyTasks, communications] = await Promise.all([
    familyService.detail(familyId),
    tasksService.query({ pageNo: 1, pageSize: 20, familyId }).catch(() => ({ list: [], page: { pageNo: 1, pageSize: 20, total: 0 } })),
    communicationService.queryRecords({ pageNo: 1, pageSize: 20, familyId }).catch(() => ({ list: [], page: { pageNo: 1, pageSize: 20, total: 0 } })),
  ]);

  const profilePanel = (
    <SummaryPanel
      title="家庭档案"
      items={[
        { name: '家庭编码', detail: detail.family.familyCode },
        { name: '主联系人', detail: detail.family.primaryContactName ?? '--' },
        { name: '联系方式', detail: detail.family.primaryMobile ?? '--' },
        { name: '家庭结构', detail: detail.family.familyStructure ?? '未配置' },
        { name: '家庭名称', detail: detail.family.familyName ?? detail.family.primaryContactName ?? detail.family.familyCode },
        { name: '状态', detail: detail.family.status },
      ]}
    />
  );

  const membersPanel = (
    <SummaryPanel
      title="监护人与学生"
      items={[
        ...detail.guardians.map((guardian) => ({ name: guardian.name, detail: `${guardian.relation} / ${guardian.mobile ?? '未留手机号'}${guardian.isPrimary ? ' / 主联系人' : ''}` })),
        ...detail.students.map((student) => ({ name: `${student.name} / ${student.studentNo}`, detail: `${student.gradeLabel} / ${student.status}` })),
      ].length ? [
        ...detail.guardians.map((guardian) => ({ name: guardian.name, detail: `${guardian.relation} / ${guardian.mobile ?? '未留手机号'}${guardian.isPrimary ? ' / 主联系人' : ''}` })),
        ...detail.students.map((student) => ({ name: `${student.name} / ${student.studentNo}`, detail: `${student.gradeLabel} / ${student.status}` })),
      ] : [{ name: '暂无成员', detail: '当前家庭尚未配置监护人与学生。' }]}
    />
  );

  const tasksPanel = (
    <TimelinePanel
      title="家庭任务"
      items={familyTasks.list.length
        ? familyTasks.list.map((task) => ({ title: `${task.title} / ${task.status}`, detail: `${task.type} / 截止 ${task.dueLabel} / owner ${task.ownerUserId}` }))
        : detail.tasks.length
          ? detail.tasks.map((item, index) => ({ title: `家庭任务 ${index + 1}`, detail: JSON.stringify(item) }))
          : [{ title: '暂无家庭任务', detail: '当前无待办任务。' }]}
    />
  );

  const communicationsPanel = (
    <TimelinePanel
      title="沟通记录"
      items={communications.list.length
        ? communications.list.map((record) => ({ title: `${record.subject} / ${record.channel}`, detail: `${record.occurredAt} / ${record.direction} / ${record.studentName}` }))
        : detail.communications.length
          ? detail.communications.map((item, index) => ({ title: `沟通记录 ${index + 1}`, detail: JSON.stringify(item) }))
          : [{ title: '暂无沟通记录', detail: '当前无沟通记录。' }]}
    />
  );

  const activePanel = activeTab === 'members' ? membersPanel : activeTab === 'tasks' ? tasksPanel : activeTab === 'communications' ? communicationsPanel : profilePanel;

  return (
    <div className="stack">
      <PageBreadcrumbs items={[{ label: '家庭列表', href: '/families' }, { label: detail.family.familyName ?? detail.family.primaryContactName ?? detail.family.familyCode }]} />
      <PageHeader
        title={`家庭详情 · ${detail.family.familyName ?? detail.family.primaryContactName ?? detail.family.familyCode}`}
        description={`${detail.family.familyCode} / 主联系人 ${detail.family.primaryContactName ?? '--'} / 状态 ${detail.family.status}`}
        actions={<><Link className="btn primary" href="/families">返回家庭列表</Link><Link className="btn" href={`/families/${familyId}?tab=tasks`}>查看家庭任务</Link><Link className="btn" href={`/families/${familyId}?tab=communications`}>查看沟通记录</Link></>}
      />
      <TabStrip tabs={tabs} active={activeTab} baseUrl={`/families/${familyId}`} />
      <div className="grid-2">
        {activePanel}
        <TimelinePanel
          title="家庭经营摘要"
          items={[
            { title: '监护人数', detail: `${detail.guardians.length} 位` },
            { title: '关联学生', detail: `${detail.students.length} 位` },
            { title: '任务覆盖', detail: familyTasks.list.length ? `${familyTasks.list.length} 条关联任务` : `${detail.tasks.length} 条任务` },
            { title: '最近沟通', detail: communications.list[0] ? `${communications.list[0].subject} / ${communications.list[0].occurredAt}` : detail.communications[0] ? formatDateTime((detail.communications[0] as { updatedAt?: string }).updatedAt) : '暂无沟通' },
          ]}
        />
      </div>
    </div>
  );
}
