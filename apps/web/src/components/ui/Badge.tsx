import React from 'react';
import { cn } from '../../utils/cn.js';
import { CheckCircle2, HelpCircle, AlertTriangle, Info, GitCommit } from 'lucide-react';

export type BadgeCategory = 'FACT' | 'INFERENCE' | 'HYPOTHESIS' | 'UNKNOWN' | 'RESOLVED' | 'UNRESOLVED' | 'DEFAULT';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  category?: BadgeCategory;
  showIcon?: boolean;
}

export function Badge({
  className,
  category = 'DEFAULT',
  showIcon = true,
  children,
  ...props
}: BadgeProps) {
  const categoryConfig: Record<BadgeCategory, { style: string; icon: React.ReactNode }> = {
    FACT: {
      style: 'bg-[#ecfdf5] text-[#065f46] border-[#a7f3d0]',
      icon: <CheckCircle2 className="w-3 h-3 text-[#065f46]" />,
    },
    INFERENCE: {
      style: 'bg-[#fffbeb] text-[#92400e] border-[#fde68a]',
      icon: <Info className="w-3 h-3 text-[#92400e]" />,
    },
    HYPOTHESIS: {
      style: 'bg-[#f1f5f9] text-[#334155] border-[#cbd5e1]',
      icon: <GitCommit className="w-3 h-3 text-[#334155]" />,
    },
    UNKNOWN: {
      style: 'bg-[#f8fafc] text-[#64748b] border-[#e2e8f0]',
      icon: <HelpCircle className="w-3 h-3 text-[#64748b]" />,
    },
    RESOLVED: {
      style: 'bg-[#ecfdf5] text-[#065f46] border-[#a7f3d0]',
      icon: <CheckCircle2 className="w-3 h-3 text-[#065f46]" />,
    },
    UNRESOLVED: {
      style: 'bg-[#fff1f2] text-[#be123c] border-[#fecdd3]',
      icon: <AlertTriangle className="w-3 h-3 text-[#be123c]" />,
    },
    DEFAULT: {
      style: 'bg-surface-subtle text-primary border-border-subtle',
      icon: null,
    },
  };

  const { style, icon } = categoryConfig[category] || categoryConfig.DEFAULT;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium border font-mono tracking-tight select-none',
        style,
        className
      )}
      {...props}
    >
      {showIcon && icon}
      <span>{children}</span>
    </span>
  );
}
