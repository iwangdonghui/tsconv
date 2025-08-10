#!/usr/bin/env node

import http from 'http';

const BASE_URL = 'http://localhost:3000';

// 测试用例
const testCases = [
  {
    name: '简化健康检查',
    method: 'GET',
    path: '/api/working-health',
    expected: 200,
  },
  {
    name: '简化时间戳转换',
    method: 'GET',
    path: '/api/working-convert?timestamp=1642248600',
    expected: 200,
  },
  {
    name: '简化日期转换',
    method: 'GET',
    path: '/api/working-convert?date=2022-01-15T14:30:00Z',
    expected: 200,
  },
  {
    name: '简化批量转换',
    method: 'POST',
    path: '/api/working-batch',
    body: {
      items: [1642248600, 1642335000, '2022-01-16T10:00:00Z'],
      outputFormats: ['iso8601', 'timestamp', 'local'],
    },
    expected: 200,
  },
  {
    name: '基础测试端点',
    method: 'GET',
    path: '/api/test',
    expected: 200,
  },
];

async function makeRequest(testCase) {
  return new Promise(resolve => {
    const url = new URL(BASE_URL + testCase.path);
    const options = {
      hostname: url.hostname,
      port: url.port || 3000,
      path: url.pathname + url.search,
      method: testCase.method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'API-Test-Script/1.0',
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
            success: res.statusCode === testCase.expected,
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data,
            success: false,
            error: 'Invalid JSON response',
          });
        }
      });
    });

    req.on('error', err => {
      resolve({
        status: 0,
        data: null,
        success: false,
        error: err.message,
      });
    });

    if (testCase.body) {
      req.write(JSON.stringify(testCase.body));
    }

    req.end();
  });
}

async function runTests() {
  console.log('🧪 测试简化版API...\n');
  console.log(`📡 测试服务器: ${BASE_URL}\n`);

  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    process.stdout.write(`⏳ 测试: ${testCase.name}... `);

    const result = await makeRequest(testCase);

    if (result.success) {
      console.log('✅ 通过');
      if (result.data && result.data.success) {
        console.log(`   响应: ${result.data.success ? '成功' : '失败'}`);
      }
      passed++;
    } else {
      console.log('❌ 失败');
      console.log(`   状态码: ${result.status} (期望: ${testCase.expected})`);
      if (result.error) {
        console.log(`   错误: ${result.error}`);
      }
      if (result.data && typeof result.data === 'string') {
        console.log(`   响应: ${result.data.substring(0, 200)}...`);
      }
      failed++;
    }
  }

  console.log('\n📊 测试结果:');
  console.log(`✅ 通过: ${passed}`);
  console.log(`❌ 失败: ${failed}`);
  console.log(`📈 成功率: ${Math.round((passed / (passed + failed)) * 100)}%`);

  if (failed > 0) {
    console.log('\n💡 提示:');
    console.log('- 确保开发服务器正在运行 (npm run dev:api)');
    console.log('- 这些是简化版API，不依赖复杂的模块导入');
    console.log('- 查看服务器日志获取详细错误信息');
  } else {
    console.log('\n🎉 所有简化版API测试通过！');
    console.log('现在可以逐步修复复杂版本的API了。');
  }

  process.exit(failed > 0 ? 1 : 0);
}

// 检查服务器是否运行
async function checkServer() {
  console.log('🔍 检查服务器状态...');

  const result = await makeRequest({
    name: 'Server Check',
    method: 'GET',
    path: '/api/test',
    expected: 200,
  });

  if (!result.success) {
    console.log('❌ 服务器未运行或无法访问');
    console.log('请先运行: npm run dev:api');
    process.exit(1);
  }

  console.log('✅ 服务器运行正常\n');
}

// 主函数
async function main() {
  await checkServer();
  await runTests();
}

main().catch(console.error);
