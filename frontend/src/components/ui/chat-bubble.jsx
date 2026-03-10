import * as React from 'react';
import { cn } from '@/lib/utils';
import { MessageLoading } from '@/components/ui/message-loading';
import UserAvatar from '@/components/UserAvatar';
import { Button } from '@/components/ui/button';

export function ChatBubble({ variant = 'received', className, children }) {
  return (
    <div
      className={cn(
        'flex items-end gap-2',
        variant === 'sent' && 'flex-row-reverse',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function ChatBubbleMessage({ variant = 'received', isLoading, className, children }) {
  return (
    <div
      className={cn(
        'rounded-2xl px-3 py-2 text-xs leading-relaxed max-w-[70%] break-words whitespace-pre-wrap',
        variant === 'sent'
          ? 'bg-primary text-primary-foreground rounded-br-sm'
          : 'bg-muted text-foreground rounded-bl-sm',
        className,
      )}
    >
      {isLoading ? (
        <div className="flex items-center px-1 py-0.5">
          <MessageLoading />
        </div>
      ) : (
        children
      )}
    </div>
  );
}

// user: { firstName, lastName, photoURL }
export function ChatBubbleAvatar({ user, className }) {
  return (
    <div className={cn('flex-shrink-0 mb-4', className)}>
      <UserAvatar user={user} sizePx={28} />
    </div>
  );
}

export function ChatBubbleAction({ icon, onClick, className }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn('h-6 w-6', className)}
      onClick={onClick}
    >
      {icon}
    </Button>
  );
}

export function ChatBubbleActionWrapper({ className, children }) {
  return (
    <div className={cn('flex items-center gap-1 mt-1', className)}>
      {children}
    </div>
  );
}
