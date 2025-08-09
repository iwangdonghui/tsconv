import React, { useState, useEffect } from 'react';
import { Trash2, RefreshCw, Database, Wifi, WifiOff, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useServiceWorker, formatCacheSize, getNetworkInfo } from '@/utils/service-worker';

interface CacheManagerProps {
  className?: string;
  showNetworkInfo?: boolean;
  showCacheDetails?: boolean;
}

interface CacheInfo {
  name: string;
  size: number;
  entries: number;
}

export function CacheManager({ 
  className, 
  showNetworkInfo = true, 
  showCacheDetails = true 
}: CacheManagerProps) {
  const {
    isSupported,
    isRegistered,
    isOnline,
    updateAvailable,
    register,
    update,
    activateWaiting,
    getCacheInfo,
    clearCaches,
    clearCache
  } = useServiceWorker();

  const [caches, setCaches] = useState<CacheInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [networkInfo, setNetworkInfo] = useState(getNetworkInfo());

  // Load cache information
  const loadCacheInfo = async () => {
    setLoading(true);
    try {
      const cacheInfo = await getCacheInfo();
      setCaches(cacheInfo);
    } catch (error) {
      console.error('Failed to load cache info:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle service worker registration
  const handleRegister = async () => {
    setLoading(true);
    try {
      await register();
      await loadCacheInfo();
    } catch (error) {
      console.error('Failed to register service worker:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle service worker update
  const handleUpdate = async () => {
    setLoading(true);
    try {
      await update();
      if (updateAvailable) {
        await activateWaiting();
        window.location.reload();
      }
    } catch (error) {
      console.error('Failed to update service worker:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle clear all caches
  const handleClearAll = async () => {
    if (!confirm('Are you sure you want to clear all caches? This will remove all offline data.')) {
      return;
    }

    setLoading(true);
    try {
      await clearCaches();
      await loadCacheInfo();
    } catch (error) {
      console.error('Failed to clear caches:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle clear specific cache
  const handleClearCache = async (cacheName: string) => {
    if (!confirm(`Are you sure you want to clear the "${cacheName}" cache?`)) {
      return;
    }

    setLoading(true);
    try {
      await clearCache(cacheName);
      await loadCacheInfo();
    } catch (error) {
      console.error(`Failed to clear cache ${cacheName}:`, error);
    } finally {
      setLoading(false);
    }
  };

  // Update network info periodically
  useEffect(() => {
    const updateNetworkInfo = () => {
      setNetworkInfo(getNetworkInfo());
    };

    const connection = (navigator as any).connection;
    if (connection) {
      connection.addEventListener('change', updateNetworkInfo);
      return () => connection.removeEventListener('change', updateNetworkInfo);
    }
  }, []);

  // Load cache info on mount and when service worker state changes
  useEffect(() => {
    if (isRegistered) {
      loadCacheInfo();
    }
  }, [isRegistered]);

  const totalCacheSize = caches.reduce((total, cache) => total + cache.size, 0);
  const totalCacheEntries = caches.reduce((total, cache) => total + cache.entries, 0);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Service Worker Status */}
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Database className="w-5 h-5" />
            Cache Manager
          </h3>
          <div className="flex items-center gap-2">
            {isOnline ? (
              <Wifi className="w-4 h-4 text-green-500" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-500" />
            )}
            <span className={cn(
              "text-sm font-medium",
              isOnline ? "text-green-600" : "text-red-600"
            )}>
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="text-center p-3 bg-muted rounded-lg">
            <div className="text-2xl font-bold text-primary">
              {isSupported ? '✅' : '❌'}
            </div>
            <div className="text-sm text-muted-foreground">
              Service Worker {isSupported ? 'Supported' : 'Not Supported'}
            </div>
          </div>

          <div className="text-center p-3 bg-muted rounded-lg">
            <div className="text-2xl font-bold text-primary">
              {isRegistered ? '✅' : '❌'}
            </div>
            <div className="text-sm text-muted-foreground">
              {isRegistered ? 'Registered' : 'Not Registered'}
            </div>
          </div>

          <div className="text-center p-3 bg-muted rounded-lg">
            <div className="text-2xl font-bold text-primary">
              {updateAvailable ? '🔄' : '✅'}
            </div>
            <div className="text-sm text-muted-foreground">
              {updateAvailable ? 'Update Available' : 'Up to Date'}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {!isRegistered && isSupported && (
            <button
              onClick={handleRegister}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              Enable Offline Mode
            </button>
          )}

          {updateAvailable && (
            <button
              onClick={handleUpdate}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              <RefreshCw className="w-4 h-4" />
              Update App
            </button>
          )}

          {isRegistered && (
            <button
              onClick={loadCacheInfo}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 disabled:opacity-50"
            >
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
              Refresh
            </button>
          )}
        </div>
      </div>

      {/* Network Information */}
      {showNetworkInfo && (
        <div className="rounded-lg border bg-card p-4">
          <h4 className="font-semibold mb-3">Network Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Connection:</span>
              <div className="font-medium">
                {networkInfo.effectiveType || 'Unknown'}
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">Downlink:</span>
              <div className="font-medium">
                {networkInfo.downlink ? `${networkInfo.downlink} Mbps` : 'Unknown'}
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">RTT:</span>
              <div className="font-medium">
                {networkInfo.rtt ? `${networkInfo.rtt} ms` : 'Unknown'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cache Details */}
      {showCacheDetails && isRegistered && (
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold">Cache Storage</h4>
            {caches.length > 0 && (
              <button
                onClick={handleClearAll}
                disabled={loading}
                className="inline-flex items-center gap-2 px-3 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 disabled:opacity-50 text-sm"
              >
                <Trash2 className="w-4 h-4" />
                Clear All
              </button>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : caches.length > 0 ? (
            <>
              <div className="mb-4 p-3 bg-muted rounded-lg">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Total Size:</span>
                    <div className="font-medium">{formatCacheSize(totalCacheSize)}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total Entries:</span>
                    <div className="font-medium">{totalCacheEntries}</div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                {caches.map((cache) => (
                  <div
                    key={cache.name}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg"
                  >
                    <div>
                      <div className="font-medium">{cache.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {cache.entries} entries • {formatCacheSize(cache.size)}
                      </div>
                    </div>
                    <button
                      onClick={() => handleClearCache(cache.name)}
                      disabled={loading}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-destructive text-destructive-foreground rounded text-sm hover:bg-destructive/90 disabled:opacity-50"
                    >
                      <Trash2 className="w-3 h-3" />
                      Clear
                    </button>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No caches found
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default CacheManager;
