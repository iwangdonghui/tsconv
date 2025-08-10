import ReactDOM from 'react-dom/client';
import MinimalApp from './SimpleApp.minimal';
import './index.css';

// 简化的入口文件，移除所有可能有问题的依赖
console.log('✅ 简化版本启动中...');

// 基本的错误处理
window.addEventListener('error', event => {
  console.error('全局错误:', event.error);
});

window.addEventListener('unhandledrejection', event => {
  console.error('未处理的 Promise 拒绝:', event.reason);
});

// 渲染应用
const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<MinimalApp />);

console.log('✅ 简化版本启动完成');
