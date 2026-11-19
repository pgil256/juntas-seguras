import React, { PropsWithChildren } from 'react';
import { renderHook, RenderHookOptions } from '@testing-library/react';
import { SWRConfig } from 'swr';

export function renderSWRHook<Result, Props>(callback: (props: Props) => Result, options?: RenderHookOptions<Props>) {
  const cache = new Map();
  function Wrapper({ children }: PropsWithChildren) {
    return <SWRConfig value={{ provider: () => cache }}>{children}</SWRConfig>;
  }
  return renderHook(callback, { ...options, wrapper: Wrapper });
}
