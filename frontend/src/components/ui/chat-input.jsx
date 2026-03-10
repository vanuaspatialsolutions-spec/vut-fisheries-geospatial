import * as React from 'react';
import { cn } from '@/lib/utils';

const ChatInput = React.forwardRef(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      'flex w-full bg-background text-sm placeholder:text-muted-foreground',
      'focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
      className,
    )}
    {...props}
  />
));
ChatInput.displayName = 'ChatInput';

export { ChatInput };
