import { useEffect, useState } from 'react';

interface ServiceStatus {
  available: boolean;
  type: string;
  description: string;
}

export const checkServiceAvailability = async () => {
  // Safely check environment variables with fallbacks
  const hasRedis = !!(
    (typeof process !== 'undefined' && process.env?.REDIS_URL) ||
    (typeof process !== 'undefined' && process.env?.KV_URL) ||
    false
  );

  return {
    redis: {
      available: hasRedis,
      type: hasRedis ? 'redis' : 'memory',
      description: hasRedis ? 'Redis缓存服务' : '内存缓存服务',
    },
    rateLimit: {
      available: true,
      type: 'memory',
      description: '内存限流服务',
    },
    timezone: {
      available: true,
      type: 'iana',
      description: 'IANA时区数据库',
    },
    format: {
      available: true,
      type: 'built-in',
      description: '内置格式服务',
    },
  };
};

export const ServiceStatusIndicator = () => {
  const [services, setServices] = useState<Record<string, ServiceStatus>>({});

  useEffect(() => {
    checkServiceAvailability().then(setServices);
  }, []);

  return (
    <div className='text-sm text-slate-600 dark:text-slate-400'>
      {Object.entries(services).map(([name, service]) => {
        const spanClass = service.available ? 'bg-green-500' : 'bg-yellow-500';
        return (
          <div key={name} className='flex items-center space-x-2'>
            <span className={`w-2 h-2 rounded-full ${spanClass}`}></span>
            <span>
              {service.description} ({service.type})
            </span>
          </div>
        );
      })}
    </div>
  );
};
