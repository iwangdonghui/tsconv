// 创建环境检测工具
export const getEnvironment = () => {
  return {
    isDevelopment: process.env.NODE_ENV === 'development',
    isProduction: process.env.NODE_ENV === 'production',
    isTest: process.env.NODE_ENV === 'test',
    hasRedis: !!process.env.REDIS_URL || !!process.env.KV_URL,
    hasRateLimiter: true, // 内存实现始终可用
  };
};

// 创建服务可用性检测
export const checkServiceAvailability = async () => {
  const env = getEnvironment();
  
  return {
    redis: {
      available: env.hasRedis,
      type: env.hasRedis ? 'redis' : 'memory',
      description: env.hasRedis ? 'Redis缓存服务' : '内存缓存服务'
    },
    rateLimit: {
      available: true,
      type: 'memory',
      description: '内存限流服务'
    },
    timezone: {
      available: true,
      type: 'iana',
      description: 'IANA时区数据库'
    },
    format: {
      available: true,
      type: 'built-in',
      description: '内置格式服务'
    }
  };
};

// 创建服务状态指示器
export const ServiceStatusIndicator = () => {
  const [services, setServices] = useState({});
  
  useEffect(() => {
    checkServiceAvailability().then(setServices);
  }, []);
  
  return (
    <div className="text-sm text-slate-600 dark:text-slate-400">
      {Object.entries(services).map(([name, service]) => (
        <div key={name} className="flex items-center space-x-2">
          <span className={`w-2 h-2 rounded-full ${
            service.available ? 'bg-green-500' : 'bg-yellow-500'
          }`}></span>
          <span>{service.description} ({service.type})</span>
        </div>
      ))}
    </div>
  );
};