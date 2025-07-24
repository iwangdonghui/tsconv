/**
 * Redis client service
 * This is a mock implementation of a Redis client
 * In a real application, you would use a Redis client library like ioredis
 */

import config from '../config/config.js';

// Mock Redis client implementation
class MockRedisClient {
  private connected: boolean = false;
  private storage = new Map<string, string>();
  private connectionUrl: string;
  private connectionOptions: any;
  
  constructor(url: string, options: any = {}) {
    this.connectionUrl = url;
    this.connectionOptions = options;
    console.log(`[MockRedis] Initialized with URL: ${this.maskUrl(url)}`);
  }
  
  async connect(): Promise<void> {
    // Simulate connection delay
    await new Promise(resolve => setTimeout(resolve, 100));
    this.connected = true;
    console.log(`[MockRedis] Connected to ${this.maskUrl(this.connectionUrl)}`);
  }
  
  async disconnect(): Promise<void> {
    // Simulate disconnection delay
    await new Promise(resolve => setTimeout(resolve, 50));
    this.connected = false;
    console.log(`[MockRedis] Disconnected from ${this.maskUrl(this.connectionUrl)}`);
  }
  
  async get(key: string): Promise<string | null> {
    this.checkConnection();
    
    // Simulate Redis get operation
    const value = this.storage.get(key);
    
    // Check if value exists and is not expired
    if (value) {
      const [data, expiry] = this.parseValue(value);
      
      if (expiry && Date.now() > expiry) {
        // Value has expired
        this.storage.delete(key);
        return null;
      }
      
      return data;
    }
    
    return null;
  }
  
  async set(key: string, value: string, ttl?: number): Promise<'OK'> {
    this.checkConnection();
    
    // Simulate Redis set operation
    const expiry = ttl ? Date.now() + ttl : undefined;
    this.storage.set(key, this.formatValue(value, expiry));
    
    return 'OK';
  }
  
  async setex(key: string, seconds: number, value: string): Promise<'OK'> {
    return this.set(key, value, seconds * 1000);
  }
  
  async del(key: string): Promise<number> {
    this.checkConnection();
    
    // Simulate Redis del operation
    const existed = this.storage.has(key);
    this.storage.delete(key);
    
    return existed ? 1 : 0;
  }
  
  async exists(key: string): Promise<number> {
    this.checkConnection();
    
    // Simulate Redis exists operation
    return this.storage.has(key) ? 1 : 0;
  }
  
  async expire(key: string, seconds: number): Promise<number> {
    this.checkConnection();
    
    // Simulate Redis expire operation
    const value = this.storage.get(key);
    
    if (value) {
      const [data] = this.parseValue(value);
      this.storage.set(key, this.formatValue(data, Date.now() + seconds * 1000));
      return 1;
    }
    
    return 0;
  }
  
  async ttl(key: string): Promise<number> {
    this.checkConnection();
    
    // Simulate Redis ttl operation
    const value = this.storage.get(key);
    
    if (value) {
      const [, expiry] = this.parseValue(value);
      
      if (expiry) {
        const ttl = Math.ceil((expiry - Date.now()) / 1000);
        return ttl > 0 ? ttl : -1;
      }
      
      return -1; // No expiry
    }
    
    return -2; // Key does not exist
  }
  
  async keys(pattern: string): Promise<string[]> {
    this.checkConnection();
    
    // Simulate Redis keys operation with simple pattern matching
    const keys: string[] = [];
    
    // Convert iterator to array to avoid downlevelIteration issues
    const allKeys = Array.from(this.storage.keys());
    
    for (const key of allKeys) {
      if (this.matchesPattern(key, pattern)) {
        keys.push(key);
      }
    }
    
    return keys;
  }
  
  async flushall(): Promise<'OK'> {
    this.checkConnection();
    
    // Simulate Redis flushall operation
    this.storage.clear();
    
    return 'OK';
  }
  
  async info(section?: string): Promise<string> {
    this.checkConnection();
    
    // Simulate Redis info operation
    return `# Server
redis_version:6.2.6
redis_mode:standalone
os:Mock OS
arch_bits:64
multiplexing_api:Mock
atomicvar_api:Mock
gcc_version:10.2.0
process_id:12345
run_id:mock-run-id
tcp_port:6379
uptime_in_seconds:${Math.floor(process.uptime())}
uptime_in_days:${Math.floor(process.uptime() / 86400)}
hz:10
configured_hz:10
lru_clock:${Math.floor(Date.now() / 1000)}
executable:/usr/local/bin/redis-server
config_file:/etc/redis/redis.conf

# Clients
connected_clients:1
client_recent_max_input_buffer:0
client_recent_max_output_buffer:0
blocked_clients:0
tracking_clients:0
clients_in_timeout_table:0

# Memory
used_memory:${this.getMemoryUsage()}
used_memory_human:${this.formatMemorySize(this.getMemoryUsage())}
used_memory_rss:${this.getMemoryUsage() * 1.2}
used_memory_rss_human:${this.formatMemorySize(this.getMemoryUsage() * 1.2)}
used_memory_peak:${this.getMemoryUsage() * 1.5}
used_memory_peak_human:${this.formatMemorySize(this.getMemoryUsage() * 1.5)}
total_system_memory:${1024 * 1024 * 1024 * 8}
total_system_memory_human:8.00G
used_memory_lua:37888
used_memory_lua_human:37.00K
maxmemory:0
maxmemory_human:0B
maxmemory_policy:noeviction
allocator_frag_ratio:1.0
allocator_frag_bytes:0
allocator_rss_ratio:1.0
allocator_rss_bytes:0
rss_overhead_ratio:1.0
rss_overhead_bytes:0
mem_fragmentation_ratio:1.0
mem_fragmentation_bytes:0
mem_not_counted_for_evict:0
mem_replication_backlog:0
mem_clients_slaves:0
mem_clients_normal:0
mem_aof_buffer:0
mem_allocator:libc
active_defrag_running:0
lazyfree_pending_objects:0

# Stats
total_connections_received:1
total_commands_processed:${this.storage.size * 2}
instantaneous_ops_per_sec:0
total_net_input_bytes:0
total_net_output_bytes:0
instantaneous_input_kbps:0.00
instantaneous_output_kbps:0.00
rejected_connections:0
sync_full:0
sync_partial_ok:0
sync_partial_err:0
expired_keys:0
expired_stale_perc:0.00
expired_time_cap_reached_count:0
expire_cycle_cpu_milliseconds:0
evicted_keys:0
keyspace_hits:0
keyspace_misses:0
pubsub_channels:0
pubsub_patterns:0
latest_fork_usec:0
migrate_cached_sockets:0
slave_expires_tracked_keys:0
active_defrag_hits:0
active_defrag_misses:0
active_defrag_key_hits:0
active_defrag_key_misses:0
tracking_total_keys:0
tracking_total_items:0
tracking_total_prefixes:0
unexpected_error_replies:0
total_reads_processed:0
total_writes_processed:0
io_threaded_reads_processed:0
io_threaded_writes_processed:0

# Keyspace
db0:keys=${this.storage.size},expires=0,avg_ttl=0
`;
  }
  
  // Helper methods
  private checkConnection(): void {
    if (!this.connected) {
      throw new Error('Redis client not connected');
    }
  }
  
  private formatValue(data: string, expiry?: number): string {
    return JSON.stringify({ data, expiry });
  }
  
  private parseValue(value: string): [string, number | undefined] {
    try {
      const { data, expiry } = JSON.parse(value);
      return [data, expiry];
    } catch (error) {
      return [value, undefined];
    }
  }
  
  private matchesPattern(key: string, pattern: string): boolean {
    // Simple pattern matching for Redis keys
    // This is a very simplified version that only supports * wildcard
    const regexPattern = pattern
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.')
      .replace(/\[([^\]]*)\]/g, (_, chars) => `[${chars}]`);
    
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(key);
  }
  
  private getMemoryUsage(): number {
    // Estimate memory usage based on storage size
    let size = 0;
    
    // Convert iterator to array to avoid downlevelIteration issues
    const entries = Array.from(this.storage.entries());
    
    for (const [key, value] of entries) {
      size += key.length * 2; // UTF-16 characters
      size += value.length * 2; // UTF-16 characters
      size += 56; // Overhead for each entry
    }
    
    return size;
  }
  
  private formatMemorySize(bytes: number): string {
    const units = ['B', 'K', 'M', 'G', 'T'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(2)}${units[unitIndex]}`;
  }
  
  private maskUrl(url: string): string {
    try {
      const parsedUrl = new URL(url);
      
      if (parsedUrl.password) {
        parsedUrl.password = '********';
      }
      
      return parsedUrl.toString();
    } catch (error) {
      return url.replace(/:[^:@]+@/, ':********@');
    }
  }
}

// Redis client factory
export function createRedisClient(type: 'cache' | 'rateLimiting' | 'main' = 'main') {
  const redisConfig = config.caching.redis;
  
  // In a real application, you would use a Redis client library
  // For now, we'll use our mock implementation
  return new MockRedisClient(redisConfig.url, {
    password: redisConfig.password,
    maxRetries: redisConfig.maxRetries,
    keyPrefix: `tsconv:${type}:`
  });
}

// Create and export default Redis client
const redisClient = createRedisClient('main');

export default redisClient;