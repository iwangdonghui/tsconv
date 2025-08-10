#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * FAQ SEO Testing Script
 * Tests FAQ component for SEO optimization and long-tail keyword coverage
 */

import fs from 'fs';

// 长尾关键词列表 - 这些是用户可能搜索的问题
const longTailKeywords = [
  '时间戳到毫秒',
  'timestamp to milliseconds',
  '为什么从1970年开始',
  'why 1970 unix timestamp',
  '如何处理闰秒',
  'leap second handling',
  '时区处理',
  'timezone handling',
  '负数时间戳',
  'negative timestamp',
  '2038年问题',
  '2038 problem',
  '在线转换时间戳',
  'convert timestamp online',
  '数据库时间戳存储',
  'database timestamp storage',
  'JavaScript时间戳',
  'Python时间戳',
  'Unix时间戳格式',
  'timestamp format types'
];

// SEO最佳实践检查项
const seoChecks = [
  {
    name: '结构化数据',
    check: (content) => content.includes('application/ld+json') && content.includes('FAQPage'),
    description: '检查是否包含FAQ结构化数据'
  },
  {
    name: '语义化HTML',
    check: (content) => content.includes('<section') && content.includes('aria-expanded'),
    description: '检查是否使用语义化HTML和可访问性属性'
  },
  {
    name: '关键词覆盖',
    check: (content) => {
      const covered = longTailKeywords.filter(keyword => 
        content.toLowerCase().includes(keyword.toLowerCase())
      );
      return covered.length >= longTailKeywords.length * 0.7; // 至少覆盖70%的关键词
    },
    description: '检查长尾关键词覆盖率'
  },
  {
    name: 'FAQ数量',
    check: (content) => {
      const faqMatches = content.match(/question:/g);
      return faqMatches && faqMatches.length >= 8; // 至少8个FAQ
    },
    description: '检查FAQ数量是否足够'
  },
  {
    name: '交互性',
    check: (content) => content.includes('toggleItem') && content.includes('useState'),
    description: '检查是否具有良好的交互性'
  }
];

function testFAQComponent() {
  console.log('🔍 Testing FAQ Component for SEO Optimization\n');

  // 读取FAQ组件文件
  const faqPath = 'src/components/FAQ.tsx';
  if (!fs.existsSync(faqPath)) {
    console.log('❌ FAQ component not found');
    return false;
  }

  const faqContent = fs.readFileSync(faqPath, 'utf8');
  
  let passedChecks = 0;
  let totalChecks = seoChecks.length;

  // 执行SEO检查
  seoChecks.forEach(check => {
    const passed = check.check(faqContent);
    console.log(`${passed ? '✅' : '❌'} ${check.name}`);
    console.log(`   ${check.description}`);
    
    if (check.name === '关键词覆盖') {
      const covered = longTailKeywords.filter(keyword => 
        faqContent.toLowerCase().includes(keyword.toLowerCase())
      );
      console.log(`   覆盖的关键词: ${covered.length}/${longTailKeywords.length}`);
      console.log(`   覆盖率: ${Math.round(covered.length / longTailKeywords.length * 100)}%`);
    }
    
    console.log('');
    
    if (passed) passedChecks++;
  });

  // 分析FAQ内容质量
  console.log('📊 FAQ Content Analysis:');
  
  const faqMatches = faqContent.match(/question: '([^']+)'/g);
  if (faqMatches) {
    console.log(`   FAQ数量: ${faqMatches.length}`);
    console.log(`   平均问题长度: ${Math.round(faqMatches.reduce((sum, q) => sum + q.length, 0) / faqMatches.length)} 字符`);
  }

  const answerMatches = faqContent.match(/answer: '([^']+)'/g);
  if (answerMatches) {
    const avgAnswerLength = Math.round(answerMatches.reduce((sum, a) => sum + a.length, 0) / answerMatches.length);
    console.log(`   平均答案长度: ${avgAnswerLength} 字符`);
    console.log(`   答案质量: ${avgAnswerLength > 100 ? '✅ 详细' : '⚠️ 可以更详细'}`);
  }

  // 检查关键词密度
  const keywordDensity = longTailKeywords.map(keyword => {
    const regex = new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const matches = faqContent.match(regex);
    return {
      keyword,
      count: matches ? matches.length : 0
    };
  }).filter(item => item.count > 0);

  console.log(`\n🎯 关键词分析:`);
  console.log(`   包含的关键词: ${keywordDensity.length}/${longTailKeywords.length}`);
  keywordDensity.slice(0, 5).forEach(item => {
    console.log(`   "${item.keyword}": ${item.count}次`);
  });

  // 总结
  console.log(`\n📈 SEO优化评分: ${passedChecks}/${totalChecks} (${Math.round(passedChecks / totalChecks * 100)}%)`);
  
  if (passedChecks === totalChecks) {
    console.log('🎉 FAQ组件SEO优化完美！');
    return true;
  } else {
    console.log('⚠️ FAQ组件需要进一步SEO优化');
    return false;
  }
}

function testTimestampConverterIntegration() {
  console.log('\n🔗 Testing FAQ Integration in TimestampConverter\n');
  
  const converterPath = 'src/components/TimestampConverter.tsx';
  if (!fs.existsSync(converterPath)) {
    console.log('❌ TimestampConverter component not found');
    return false;
  }

  const converterContent = fs.readFileSync(converterPath, 'utf8');
  
  const integrationChecks = [
    {
      name: 'FAQ导入',
      check: converterContent.includes("import FAQ from './FAQ'"),
      description: '检查是否正确导入FAQ组件'
    },
    {
      name: 'FAQ渲染',
      check: converterContent.includes('<FAQ />'),
      description: '检查是否在页面中渲染FAQ组件'
    },
    {
      name: 'SEO元数据更新',
      check: converterContent.includes('FAQ') && converterContent.includes('keywords'),
      description: '检查是否更新了SEO元数据'
    }
  ];

  let passedIntegrationChecks = 0;
  
  integrationChecks.forEach(check => {
    const passed = check.check;
    console.log(`${passed ? '✅' : '❌'} ${check.name}`);
    console.log(`   ${check.description}\n`);
    
    if (passed) passedIntegrationChecks++;
  });

  console.log(`📊 集成评分: ${passedIntegrationChecks}/${integrationChecks.length} (${Math.round(passedIntegrationChecks / integrationChecks.length * 100)}%)`);
  
  return passedIntegrationChecks === integrationChecks.length;
}

// 运行测试
const faqTestPassed = testFAQComponent();
const integrationTestPassed = testTimestampConverterIntegration();

const overallSuccess = faqTestPassed && integrationTestPassed;

console.log(`\n🏆 总体评估: ${overallSuccess ? '成功' : '需要改进'}`);

if (overallSuccess) {
  console.log('✨ FAQ功能已成功实现，具备良好的SEO优化和用户体验！');
} else {
  console.log('🔧 建议继续优化FAQ功能以获得更好的SEO效果。');
}

process.exit(overallSuccess ? 0 : 1);
