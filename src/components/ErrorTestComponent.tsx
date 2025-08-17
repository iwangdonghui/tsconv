/**
 * Error Test Component
 *
 * 专门用于测试 ErrorBoundary 的组件
 * 仅在开发环境中显示
 */

import { useState } from 'react';
import { Button } from './ui/button';

export function ErrorTestComponent() {
  const [shouldThrow, setShouldThrow] = useState(false);
  const [errorType, setErrorType] = useState<'render' | 'async' | 'event'>('render');

  // 只在开发环境显示
  if (import.meta.env?.PROD) {
    return null;
  }

  // 渲染时抛出错误（会被 ErrorBoundary 捕获）
  if (shouldThrow && errorType === 'render') {
    throw new Error('🧪 测试 ErrorBoundary - 渲染错误');
  }

  // 异步错误（不会被 ErrorBoundary 捕获，但会被全局错误处理器捕获）
  const handleAsyncError = () => {
    setTimeout(() => {
      throw new Error(`🧪 测试异步错误 - ${new Date().toLocaleTimeString()}`);
    }, 100);
  };

  // Promise 错误（会被全局 unhandledrejection 处理器捕获）
  const handlePromiseError = () => {
    Promise.reject(new Error(`🧪 测试 Promise 错误 - ${new Date().toLocaleTimeString()}`));
  };

  // 事件处理器错误（会被全局错误处理器捕获）
  const handleEventError = () => {
    throw new Error(`🧪 测试事件处理器错误 - ${new Date().toLocaleTimeString()}`);
  };

  return (
    <div className='fixed bottom-20 right-4 z-40 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 shadow-lg'>
      <div className='text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-3'>
        🧪 ErrorBoundary 测试工具
      </div>

      <div className='space-y-2'>
        <div className='text-xs text-yellow-700 dark:text-yellow-300 mb-2'>选择错误类型：</div>

        <div className='flex flex-col gap-2'>
          <Button
            size='sm'
            variant='outline'
            className='text-xs'
            onClick={() => {
              setErrorType('render');
              setShouldThrow(true);
            }}
          >
            🔥 渲染错误 (ErrorBoundary)
          </Button>

          <Button size='sm' variant='outline' className='text-xs' onClick={handleAsyncError}>
            ⏰ 异步错误 (全局处理)
          </Button>

          <Button size='sm' variant='outline' className='text-xs' onClick={handlePromiseError}>
            🔮 Promise 错误 (全局处理)
          </Button>

          <Button size='sm' variant='outline' className='text-xs' onClick={handleEventError}>
            🎯 事件错误 (全局处理)
          </Button>
        </div>

        <div className='text-xs text-yellow-600 dark:text-yellow-400 mt-2 border-t border-yellow-200 dark:border-yellow-700 pt-2'>
          💡 提示：渲染错误会触发 ErrorBoundary，其他错误会被全局错误处理器捕获
        </div>
      </div>
    </div>
  );
}
