import { useLaunch } from '@tarojs/taro';
import { initCloud } from './services/cloud';
// 全局样式
import './app.scss';

function App(props) {
  // 启动即初始化微信云开发，后续所有数据都通过 PyStudio 云函数获取
  useLaunch(() => {
    initCloud();
  });

  return props.children;
}

export default App;
