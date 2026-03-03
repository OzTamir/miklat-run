/// <reference types="vite/client" />

interface PlausibleOptions {
  props?: Record<string, string>;
  callback?: (result: { status?: string; error?: string }) => void;
}

declare global {
  interface Window {
    plausible?: (eventName: string, options?: PlausibleOptions) => void;
  }
}
