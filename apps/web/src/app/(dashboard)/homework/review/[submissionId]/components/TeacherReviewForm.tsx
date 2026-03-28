'use client';

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { SummaryPanel } from '@/components/business/page-blocks';

interface Taxonomy {
  id: string;
  name: string;
}

interface TeacherReviewFormProps {
  submissionId: string;
  studentName: string;
  subject: string;
  teacherName: string;
  taxonomies: Taxonomy[];
  selectedErrorIds: Set<string>;
  formDefaults: {
    reviewResult: string;
    finalAccuracyPct: number;
    finalErrorSummary: string;
    finalSuggestion: string;
    publishToFamily: boolean;
  };
  navigation: {
    prev: { id: string; label: string } | null;
    next: { id: string; label: string } | null;
  };
  saveAction: (submissionId: string, formData: FormData) => void;
  submitAction: (submissionId: string, formData: FormData) => void;
  reviewMeta: any[];
}

export function TeacherReviewForm({ 
  submissionId, 
  studentName, 
  subject, 
  teacherName, 
  taxonomies, 
  selectedErrorIds, 
  formDefaults,
  navigation,
  saveAction,
  submitAction,
  reviewMeta
}: TeacherReviewFormProps) {
  const router = useRouter();

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // P1 Optimization: Arrow Keys Navigation
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    
    if (e.key === 'ArrowLeft' && navigation?.prev) {
      router.push(`/homework/review/${navigation.prev.id}`);
    } else if (e.key === 'ArrowRight' && navigation?.next) {
      router.push(`/homework/review/${navigation.next.id}`);
    }
  }, [navigation, router]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <form className="panel stack">
      <div className="page-header">
        <div>
          <h3>教师复核确认</h3>
          <p>确认最终评分并填写给家长的建议。提交后可同步至家长端。</p>
        </div>
      </div>
      
      <div className="summary-item" style={{ background: 'var(--bg-subtle)' }}>
        <strong>{studentName} / {subject}</strong>
        <div className="subtle">负责教师：{teacherName}</div>
      </div>
      
      <div className="form-grid">
        <div className="field">
          <label>复核结论</label>
          <select className="select" name="reviewResult" defaultValue={formDefaults.reviewResult}>
            <option value="approved">通过</option>
            <option value="adjusted">修正</option>
            <option value="rejected">退回</option>
          </select>
        </div>
        
        <div className="field">
          <label>最终正确率 (%)</label>
          <input className="input" name="finalAccuracyPct" type="number" min="0" max="100" defaultValue={String(formDefaults.finalAccuracyPct)} />
        </div>
        
        <div className="field form-span-2">
          <label>错因类型（支持多选）</label>
          <div className="chip-row" style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {taxonomies.map((taxonomy) => (
              <label className="tab" key={taxonomy.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input type="checkbox" name="errorTaxonomyId" value={taxonomy.id} defaultChecked={selectedErrorIds.has(taxonomy.id)} />
                <span>{taxonomy.name}</span>
              </label>
            ))}
          </div>
        </div>
        
        <div className="field form-span-2">
          <label>错因备注</label>
          <textarea className="textarea" name="finalErrorSummary" defaultValue={formDefaults.finalErrorSummary} placeholder="请输入具体的错误分析..." />
        </div>
        
        <div className="field form-span-2">
          <label>家长反馈建议</label>
          <textarea className="textarea" name="finalSuggestion" defaultValue={formDefaults.finalSuggestion} placeholder="请输入给家长的配合建议..." />
        </div>
        
        <div className="field form-span-2">
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" name="publishToFamily" defaultChecked={formDefaults.publishToFamily} />
            <span>完成后自动发布给家庭</span>
          </label>
        </div>
      </div>
      
      <div className="button-row" style={{ marginTop: 16 }}>
        <button className="btn" formAction={(formData) => saveAction(submissionId, formData)}>💾 保存草稿</button>
        <button className="btn primary" formAction={(formData) => submitAction(submissionId, formData)}>🚀 提交正式复核</button>
      </div>

      <SummaryPanel title="复核元信息" items={reviewMeta} />
      
      <div className="muted" style={{ fontSize: '0.85em', textAlign: 'center' }}>
        提示：支持键盘方向键 <kbd>←</kbd> <kbd>→</kbd> 快速切换作业
      </div>
    </form>
  );
}
