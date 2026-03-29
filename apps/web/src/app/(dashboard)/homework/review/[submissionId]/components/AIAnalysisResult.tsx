import { TabStrip, TimelinePanel } from '@/components/business/page-blocks';
import { SubmitButton } from '@/components/business/submit-button';

interface AIAnalysisResultProps {
  status: string;
  rawMarkdown: string;
  structuredResult: any;
  suggestions: { title: string; detail: string }[];
  triggerAction: (formData: FormData) => void;
}

export function AIAnalysisResult({ status, rawMarkdown, structuredResult, suggestions, triggerAction }: AIAnalysisResultProps) {
  return (
    <section className="panel stack">
      <div className="page-header">
        <div>
          <h3>AI 自动分析结果</h3>
          <p>AI 根据作业内容生成的评分建议和错因分析。</p>
        </div>
        <div className="button-row">
          <span className="badge">{status}</span>
          <form action={triggerAction}>
            <SubmitButton className="btn" pendingLabel="触发中...">重新触发 AI 分析</SubmitButton>
          </form>
        </div>
      </div>
      
      {/* 核心指标卡：由 P1 需求补充，展示正确率等核心信息 */}
      <div className="grid-2">
        <div className="panel" style={{ background: 'var(--bg-subtle)', textAlign: 'center' }}>
          <div className="muted">AI 预估正确率</div>
          <div style={{ fontSize: '2em', fontWeight: 'bold', color: 'var(--primary)' }}>
            {structuredResult?.accuracyPct ?? '--'}%
          </div>
        </div>
        <div className="panel" style={{ background: 'var(--bg-subtle)' }}>
          <div className="muted">识别出的主要错因</div>
          <div className="chip-row" style={{ marginTop: 8 }}>
            {structuredResult?.errorItems?.length > 0 ? (
              structuredResult.errorItems.slice(0, 3).map((item: any) => (
                <span className="badge" key={item.errorTaxonomyId}>{item.errorTaxonomyName ?? '未分类'}</span>
              ))
            ) : (
              <span className="muted">未发现明显错误</span>
            )}
          </div>
        </div>
      </div>

      <TabStrip tabs={['Markdown 视图', '原始 JSON数据']} active="Markdown 视图" />
      
      <div className="code-view" style={{ maxHeight: 300, overflow: 'auto', background: 'var(--bg-code)', padding: 16, borderRadius: 8 }}>
        {status === 'ready' ? (
          <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.9em' }}>
            {rawMarkdown}
          </pre>
        ) : (
          <div className="muted" style={{ textAlign: 'center', padding: 40 }}>AI 正在努力分析中...</div>
        )}
      </div>

      <TimelinePanel title="AI 批改建议清单" items={suggestions} />
    </section>
  );
}
