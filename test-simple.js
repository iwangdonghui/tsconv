// 简单的API测试脚本
import http from 'http';

const BASE_URL = 'http://localhost:3000';

async function testAPI(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const options = {
      hostname: url.hostname,
      port: url.port || 3000,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, res => {
      let data = '';
      res.on('data', chunk => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            status: res.statusCode,
            data: jsonData,
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data,
          });
        }
      });
    });

    req.on('error', err => {
      reject(err);
    });

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

async function runTests() {
  console.log('🧪 测试API端点...\n');

  try {
    // 测试健康检查
    console.log('⏳ 测试健康检查...');
    const health = await testAPI('/api/health');
    console.log('✅ 健康检查:', health.status, health.data?.success ? '成功' : '失败');

    // 测试基础转换
    console.log('⏳ 测试基础转换...');
    const convert = await testAPI('/api/convert?timestamp=1642248600');
    console.log('✅ 基础转换:', convert.status, convert.data?.success ? '成功' : '失败');
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.log('\n💡 请确保开发服务器正在运行: npm run dev:api');
  }
}

runTests();
