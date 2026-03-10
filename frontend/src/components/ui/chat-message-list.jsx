import * as React from 'react';
import { ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAutoScroll } from '@/hooks/use-auto-scroll';
import { cn } from '@/lib/utils';

export function ChatMessageList({ className, children, smooth = false, ...props }) {
  const { scrollRef, isAtBottom, scrollToBottom, disableAutoScroll } =
    useAutoScroll({ smooth, content: children });

  return (
    <div className="relative w-full h-full">
      <div
        ref={scrollRef}
        className={cn('flex flex-col w-full h-full overflow-y-auto px-5 py-4', className)}
        onWheel={disableAutoScroll}
        onTouchMove={disableAutoScroll}
        {...props}
      >
        <div className="flex flex-col gap-3">{children}</div>
      </div>

      {!isAtBottom && (
        <Button
          onClick={scrollToBottom}
          size="icon"
          variant="outline"
          className="absolute bottom-2 left-1/2 -translate-x-1/2 h-7 w-7 rounded-full shadow-md"
          aria-label="Scroll to bottom"
        >
          <ArrowDown className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
