import Link from 'next/link';

export interface Attachment {
  fileId: string;
  name: string;
  detail: string;
  href: string;
  directHref: string | null | undefined;
  blockedReason: string | null | undefined;
}

interface AttachmentGalleryProps {
  attachments: Attachment[];
  navigation: {
    prev: { id: string; label: string } | null;
    next: { id: string; label: string } | null;
  };
}

export function AttachmentGallery({ attachments, navigation }: AttachmentGalleryProps) {
  return (
    <section className="panel stack">
      <div className="page-header">
        <div>
          <h3>作业附件</h3>
          <p>作业附件预览，支持图片内嵌显示。</p>
        </div>
        <div className="button-row">
          {navigation?.prev ? <Link className="btn" href={`/homework/review/${navigation.prev.id}`}>上一条</Link> : null}
          {navigation?.next ? <Link className="btn" href={`/homework/review/${navigation.next.id}`}>下一条</Link> : null}
        </div>
      </div>
      
      <div className="stack" style={{ gap: 24 }}>
        {attachments.map((attachment) => (
          <div className="attachment-card" key={attachment.fileId} style={{ padding: 16, border: '1px solid var(--border)', borderRadius: 8 }}>
            {/* Inline Image Preview for P1 Optimization */}
            <div className="attachment-preview-container" style={{ marginBottom: 12, background: 'var(--bg-subtle)', borderRadius: 4, overflow: 'hidden', minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {attachment.directHref ? (
                <img 
                  src={attachment.directHref} 
                  alt={attachment.name} 
                  style={{ maxWidth: '100%', maxHeight: 600, objectFit: 'contain', cursor: 'pointer' }}
                  onClick={() => {
                    if (attachment.directHref) window.open(attachment.directHref, '_blank');
                  }}
                />
              ) : (
                <div className="muted" style={{ padding: 40, textAlign: 'center' }}>
                  {attachment.name}<br/>
                  <span style={{ fontSize: '0.8em' }}>(非图片格式或暂无直连预览)</span>
                </div>
              )}
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <strong>{attachment.name}</strong>
                <div className="subtle" style={{ fontSize: '0.9em' }}>{attachment.detail}</div>
              </div>
              <div className="button-row">
                {attachment.directHref ? <a className="btn small primary" href={attachment.directHref} target="_blank" rel="noreferrer">下载原图</a> : null}
                <a className="btn small" href={attachment.href} target="_blank" rel="noreferrer">详情</a>
              </div>
            </div>
            
            {attachment.blockedReason ? (
              <div className="badge warning" style={{ marginTop: 12, width: '100%', display: 'block', textAlign: 'center' }}>
                ⚠️ {attachment.blockedReason}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
