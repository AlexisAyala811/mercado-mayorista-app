import { FeedbackState } from '@/ui/components/feedback-state';

type EmptyStateProps = {
  actionLabel?: string;
  message: string;
  onAction?: () => void;
  title: string;
};

export function EmptyState({ actionLabel, message, onAction, title }: EmptyStateProps) {
  return (
    <FeedbackState
      actionLabel={actionLabel}
      message={message}
      onAction={onAction}
      title={title}
      tone="neutral"
    />
  );
}
