import Link from 'next/link';

export function PageBreadcrumbs({ items }: { items: Array<{ label: string; href?: string }> }) {
  return (
    <nav className="breadcrumbs" aria-label="面包屑">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <span key={`${item.label}-${index}`} className="breadcrumbs-item">
            {item.href && !isLast ? <Link href={item.href}>{item.label}</Link> : <span aria-current={isLast ? 'page' : undefined}>{item.label}</span>}
            {!isLast ? <span className="breadcrumbs-separator">/</span> : null}
          </span>
        );
      })}
    </nav>
  );
}
