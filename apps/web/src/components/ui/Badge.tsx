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
      style: 'bg-[#e3f0e9] text-[#1a573d] border-[#b4dbca]',
      icon: <CheckCircle2 className="w-3 h-3 text-[#1a573d]" />,
    },
    INFERENCE: {
      style: 'bg-[#fcf4e6] text-[#8e641b] border-[#ebd6a9]',
      icon: <Info className="w-3 h-3 text-[#8e641b]" />,
    },
    HYPOTHESIS: {
      style: 'bg-[#f0efe9] text-[#4d534e] border-[#d7d4c9]',
      icon: <GitCommit className="w-3 h-3 text-[#4d534e]" />,
    },
    UNKNOWN: {
      style: 'bg-[#f0efe9] text-[#788078] border-[#e2dfd7]',
      icon: <HelpCircle className="w-3 h-3 text-[#788078]" />,
    },
    RESOLVED: {
      style: 'bg-[#e3f0e9] text-[#1a573d] border-[#b4dbca]',
      icon: <CheckCircle2 className="w-3 h-3 text-[#1a573d]" />,
    },
    UNRESOLVED: {
      style: 'bg-[#faebea] text-[#b23a32] border-[#f0c2be]',
      icon: <AlertTriangle className="w-3 h-3 text-[#b23a32]" />,
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
