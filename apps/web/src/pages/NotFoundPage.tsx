import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button.js';
import { FileQuestion, ArrowLeft } from 'lucide-react';

export function NotFoundPage() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6">
      <div className="w-12 h-12 rounded-md bg-surface border border-border-strong flex items-center justify-center text-primary-muted mb-4 shadow-xs">
        <FileQuestion className="w-6 h-6" />
      </div>
      <h1 className="text-base font-bold text-primary tracking-tight">404 — Page Not Found</h1>
      <p className="text-xs text-primary-secondary mt-1.5 max-w-sm leading-relaxed">
        The forensic route or evidence record you requested does not exist or has been relocated.
      </p>
      <div className="mt-5">
        <Link to="/">
          <Button variant="secondary" size="sm" leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}>
            Return to Overview
          </Button>
        </Link>
      </div>
    </div>
  );
}
