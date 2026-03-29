import Link from 'next/link';
import { PageHeader } from '@/components/business/page-blocks';

interface ReviewHeaderProps {
  submissionNo: string;
  aiStatus: string;
  navigation: {
    prev: { id: string; label: string } | null;
    next: { id: string; label: string } | null;
  };
}

const statusLabelMap: Record<string, string> = {
  pending: '等待分析',
  running: '分析中',
  ready: '分析完成',
  failed: '分析失败',
  skipped: '已跳过',
};

export function ReviewHeader({ submissionNo, aiStatus, navigation }: ReviewHeaderProps) {
  const statusLabel = statusLabelMap[aiStatus] ?? aiStatus;

  return (
    <PageHeader
      title={`作业复核工作台 / ${submissionNo}`}
      description="查看 AI 分析结果，提交教师复核意见"
      actions={
        <>
          {navigation?.prev ? (
            <Link className="btn" href={`/homework/review/${navigation.prev.id}`}>
              上一条：{navigation.prev.label}
            </Link>
          ) : (
            <button className="btn" disabled>没有上一条</button>
          )}
          {navigation?.next ? (
            <Link className="btn" href={`/homework/review/${navigation.next.id}`}>
              下一条：{navigation.next.label}
            </Link>
          ) : (
            <button className="btn" disabled>没有下一条</button>
          )}
          <span className="badge">{statusLabel}</span>
        </>
      }
    />
  );
}
