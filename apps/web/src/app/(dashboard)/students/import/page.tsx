import { PageHeader, StateBlock, SummaryPanel, TimelinePanel } from '@/components/business/page-blocks';
import { studentService } from '@/services/students-service';

export default function StudentsImportPage() {
  const detail = studentService.action();

  return (
    <div className="stack">
      <PageHeader
        title="学生导入中心"
        description="当前提供模板、字段映射说明与导入任务信息；正式导入入口待后端 /students/import 落地后接入。"
        actions={<><button className="btn primary">下载模板</button><button className="btn" disabled>上传文件</button></>}
      />
      <div className="grid-2">
        <SummaryPanel title="模板与字段映射" items={[{ name: '模板文件', detail: detail.template }, ...detail.jobs.slice(1).map((item) => ({ name: item.title, detail: item.detail }))]} />
        <TimelinePanel title="导入任务列表" items={detail.jobs} />
      </div>
      <StateBlock state="error" title="校验错误表" actionLabel="重新解析" />
    </div>
  );
}
