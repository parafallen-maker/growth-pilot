import { PageHeader, SummaryPanel, TimelinePanel } from '@/components/business/page-blocks';
import { familyService } from '@/services/families-service';

export default async function FamilyDetailPage({ params }: { params: Promise<{ familyId: string }> }) {
  const { familyId } = await params;
  const detail = await familyService.detail(familyId);

  return (
    <div className="stack">
      <PageHeader
        title={`家庭详情 · ${detail.family.familyName ?? detail.family.primaryContactName ?? detail.family.familyCode}`}
        description={`${detail.family.familyCode} / 主联系人 ${detail.family.primaryContactName ?? '--'} / 状态 ${detail.family.status}`}
        actions={<><button className="btn primary">添加监护人</button><button className="btn">新建家庭任务</button><button className="btn">新建沟通记录</button><button className="btn">新建会谈</button></>}
      />
      <div className="grid-3">
        <SummaryPanel
          title="监护人列表"
          items={detail.guardians.map((guardian) => ({ name: guardian.name, detail: `${guardian.relation} / ${guardian.mobile ?? '未留手机号'}${guardian.isPrimary ? ' / 主联系人' : ''}` }))}
        />
        <SummaryPanel
          title="关联学生"
          items={detail.students.map((student) => ({ name: student.name, detail: `${student.studentNo} / ${student.gradeLabel} / ${student.status}` }))}
        />
        <TimelinePanel
          title="家庭摘要"
          items={[
            { title: '联系方式', detail: detail.family.primaryMobile ?? '未配置主手机号' },
            { title: '家庭结构', detail: detail.family.familyStructure ?? '未配置' },
            { title: '任务', detail: detail.tasks.length ? `共 ${detail.tasks.length} 条` : '当前后端尚未返回家庭任务明细' },
            { title: '沟通', detail: detail.communications.length ? `共 ${detail.communications.length} 条` : '当前后端尚未返回沟通明细' },
          ]}
        />
      </div>
    </div>
  );
}
