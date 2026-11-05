/** Public Navigation API subset; feature-detected by the web caller. */
export interface BrowserTraversalEvent {
  readonly navigationType: string;
  readonly cancelable: boolean;
  readonly hashChange: boolean;
  readonly downloadRequest: string | null;
  readonly destination: { readonly key: string };
  preventDefault(): void;
}

export interface BrowserTraversalNavigation {
  addEventListener(type: 'navigate', listener: (event: BrowserTraversalEvent) => void): void;
  removeEventListener(type: 'navigate', listener: (event: BrowserTraversalEvent) => void): void;
  traverseTo(key: string): { committed: Promise<unknown>; finished: Promise<unknown> };
}

export function protectBrowserTraversal(
  navigation: BrowserTraversalNavigation,
  shouldBlock: () => boolean,
  requestExit: (leave: () => void) => void,
  onError: () => void,
): () => void {
  const listener = (event: BrowserTraversalEvent) => {
    if (!shouldBlock() || event.navigationType !== 'traverse' || !event.cancelable ||
      event.hashChange || event.downloadRequest !== null || !event.destination.key) return;

    event.preventDefault();
    const destinationKey = event.destination.key;
    requestExit(() => {
      try {
        const result = navigation.traverseTo(destinationKey);
        // Both promises may reject for the same failed traversal.
        void result.committed.catch(() => undefined);
        void result.finished.catch(onError);
      } catch {
        onError();
      }
    });
  };
  navigation.addEventListener('navigate', listener);
  return () => navigation.removeEventListener('navigate', listener);
}
