import React from 'react';
import { cn } from '../../utils/cn.js';
import { Inbox } from 'lucide-react';

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({
  className,
  icon = <Inbox className="w-8 h-8 text-primary-muted" />,
  title,
  description,
  action,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 text-center border border-dashed border-border-strong rounded-md bg-surface-subtle/30',
        className
      )}
      {...props}
    >
      <div className="mb-3 p-3 bg-surface rounded-md border border-border-subtle shadow-xs">
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-primary">{title}</h3>
      <p className="text-xs text-primary-secondary max-w-sm mt-1 leading-relaxed">
        {description}
      </p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
