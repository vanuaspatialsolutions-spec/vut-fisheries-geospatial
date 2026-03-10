import { useCallback, useEffect, useRef, useState } from 'react';

export function useAutoScroll({ offset = 20, smooth = false, content } = {}) {
  const scrollRef = useRef(null);
  const lastContentHeight = useRef(0);

  const [scrollState, setScrollState] = useState({
    isAtBottom: true,
    autoScrollEnabled: true,
  });

  const checkIsAtBottom = useCallback(
    (element) => {
      const { scrollTop, scrollHeight, clientHeight } = element;
      return Math.abs(scrollHeight - scrollTop - clientHeight) <= offset;
    },
    [offset],
  );

  const scrollToBottom = useCallback(
    (instant) => {
      if (!scrollRef.current) return;
      const target = scrollRef.current.scrollHeight - scrollRef.current.clientHeight;
      if (instant) {
        scrollRef.current.scrollTop = target;
      } else {
        scrollRef.current.scrollTo({ top: target, behavior: smooth ? 'smooth' : 'auto' });
      }
      setScrollState({ isAtBottom: true, autoScrollEnabled: true });
    },
    [smooth],
  );

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const atBottom = checkIsAtBottom(scrollRef.current);
    setScrollState((prev) => ({
      isAtBottom: atBottom,
      autoScrollEnabled: atBottom ? true : prev.autoScrollEnabled,
    }));
  }, [checkIsAtBottom]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const currentHeight = el.scrollHeight;
    if (currentHeight !== lastContentHeight.current) {
      if (scrollState.autoScrollEnabled) {
        requestAnimationFrame(() => scrollToBottom(lastContentHeight.current === 0));
      }
      lastContentHeight.current = currentHeight;
    }
  }, [content, scrollState.autoScrollEnabled, scrollToBottom]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      if (scrollState.autoScrollEnabled) scrollToBottom(true);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [scrollState.autoScrollEnabled, scrollToBottom]);

  const disableAutoScroll = useCallback(() => {
    const atBottom = scrollRef.current ? checkIsAtBottom(scrollRef.current) : false;
    if (!atBottom) {
      setScrollState((prev) => ({ ...prev, autoScrollEnabled: false }));
    }
  }, [checkIsAtBottom]);

  return {
    scrollRef,
    isAtBottom: scrollState.isAtBottom,
    autoScrollEnabled: scrollState.autoScrollEnabled,
    scrollToBottom: () => scrollToBottom(false),
    disableAutoScroll,
  };
}
