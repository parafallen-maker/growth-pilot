import { PageHeader, StateBlock, SummaryPanel, TimelinePanel } from '@/components/business/page-blocks';
import { studentService } from '@/services/students-service';

export default function StudentsImportPage() {
  const detail = studentService.action();

  return (
    <div className="stack">
      <PageHeader
        title="学生导入中心骨架"
        description="P05 已预留模板下载、上传区、字段映射、校验错误表、导入任务列表。异步任务统一用 jobId 语义。"
        actions={<><button className="btn primary">下载模板</button><button className="btn">上传文件（占位）</button></>}
      />
      <div className="grid-2">
        <SummaryPanel title="模板与字段映射" items={[{ name: '模板文件', detail: detail.template }, ...detail.jobs.slice(1).map((item) => ({ name: item.title, detail: item.detail }))]} />
        <TimelinePanel title="导入任务列表" items={detail.jobs} />
      </div>
      <StateBlock state="error" title="校验错误表" actionLabel="重新解析" />
    </div>
  );
}
