import type React from 'react';
import { cn } from '../../utils/cn.js';

export interface PanelProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
}

export function Panel({
  className,
  title,
  subtitle,
  action,
  children,
  ...props
}: PanelProps) {
  return (
    <section
      className={cn(
        'bg-surface border border-border-subtle rounded-md overflow-hidden',
        className
      )}
      {...props}
    >
      {(title || action) && (
        <header className="px-4 py-3 border-b border-border-subtle flex items-center justify-between gap-4 bg-surface-subtle/40">
          <div>
            {title && (
              <h2 className="text-sm font-semibold text-primary tracking-tight">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="text-xs text-primary-muted mt-0.5">{subtitle}</p>
            )}
          </div>
          {action && <div className="flex items-center gap-2">{action}</div>}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}
