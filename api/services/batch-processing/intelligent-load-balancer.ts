/**
 * Intelligent Load Balancer for Batch Processing
 * Dynamic load balancing with adaptive algorithms and performance optimization
 */

export interface WorkerNode {
  id: string;
  endpoint: string;
  capacity: number;
  currentLoad: number;
  averageResponseTime: number;
  errorRate: number;
  lastHealthCheck: number;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'offline';
  capabilities: string[];
  region?: string;
  priority: number;
  metadata: Record<string, unknown>;
}

export interface LoadBalancingStrategy {
  name:
    | 'round_robin'
    | 'least_connections'
    | 'weighted_round_robin'
    | 'least_response_time'
    | 'adaptive'
    | 'geographic';
  config: Record<string, unknown>;
}

export interface BatchWorkload {
  id: string;
  items: any[];
  priority: 'low' | 'normal' | 'high' | 'critical';
  estimatedComplexity: number;
  requiredCapabilities: string[];
  deadline?: number;
  region?: string;
  metadata: Record<string, unknown>;
}

export interface LoadBalancingDecision {
  selectedNode: WorkerNode;
  reason: string;
  confidence: number;
  alternativeNodes: WorkerNode[];
  estimatedCompletionTime: number;
  loadDistribution: Record<string, number>;
}

export interface LoadBalancerMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  throughput: number;
  nodeUtilization: Record<string, number>;
  strategyEffectiveness: Record<string, number>;
  adaptiveAdjustments: number;
}

/**
 * Intelligent Load Balancer
 */
export class IntelligentLoadBalancer {
  private nodes: Map<string, WorkerNode> = new Map();
  private strategy: LoadBalancingStrategy;
  private metrics: LoadBalancerMetrics;
  private requestHistory: Array<{
    timestamp: number;
    nodeId: string;
    responseTime: number;
    success: boolean;
    workloadSize: number;
  }> = [];
  private adaptiveWeights: Map<string, number> = new Map();
  private healthCheckInterval: ReturnType<typeof setInterval> | null = null;

  constructor(strategy: LoadBalancingStrategy = { name: 'adaptive', config: {} }) {
    this.strategy = strategy;
    this.metrics = this.initializeMetrics();
    this.startHealthChecking();
  }

  /**
   * Add worker node to the pool
   */
  addNode(node: WorkerNode): void {
    this.nodes.set(node.id, { ...node });
    this.adaptiveWeights.set(node.id, 1.0);
    console.log(`✅ Added worker node: ${node.id} (${node.endpoint})`);
  }

  /**
   * Remove worker node from the pool
   */
  removeNode(nodeId: string): void {
    this.nodes.delete(nodeId);
    this.adaptiveWeights.delete(nodeId);
    console.log(`❌ Removed worker node: ${nodeId}`);
  }

  /**
   * Select optimal node for workload
   */
  selectNode(workload: BatchWorkload): LoadBalancingDecision {
    const availableNodes = this.getAvailableNodes(workload);

    if (availableNodes.length === 0) {
      throw new Error('No available nodes for workload processing');
    }

    let selectedNode: WorkerNode;
    let reason: string;
    let confidence: number;

    switch (this.strategy.name) {
      case 'round_robin':
        ({ selectedNode, reason, confidence } = this.roundRobinSelection(availableNodes));
        break;
      case 'least_connections':
        ({ selectedNode, reason, confidence } = this.leastConnectionsSelection(availableNodes));
        break;
      case 'weighted_round_robin':
        ({ selectedNode, reason, confidence } = this.weightedRoundRobinSelection(availableNodes));
        break;
      case 'least_response_time':
        ({ selectedNode, reason, confidence } = this.leastResponseTimeSelection(availableNodes));
        break;
      case 'geographic':
        ({ selectedNode, reason, confidence } = this.geographicSelection(availableNodes, workload));
        break;
      case 'adaptive':
      default:
        ({ selectedNode, reason, confidence } = this.adaptiveSelection(availableNodes, workload));
        break;
    }

    // Calculate estimated completion time
    const estimatedCompletionTime = this.estimateCompletionTime(selectedNode, workload);

    // Get alternative nodes
    const alternativeNodes = availableNodes
      .filter(node => node.id !== selectedNode.id)
      .sort((a, b) => this.calculateNodeScore(b, workload) - this.calculateNodeScore(a, workload))
      .slice(0, 3);

    // Calculate load distribution
    const loadDistribution: Record<string, number> = {};
    this.nodes.forEach((node, id) => {
      loadDistribution[id] = (node.currentLoad / node.capacity) * 100;
    });

    return {
      selectedNode,
      reason,
      confidence,
      alternativeNodes,
      estimatedCompletionTime,
      loadDistribution,
    };
  }

  /**
   * Round robin selection
   */
  private roundRobinSelection(nodes: WorkerNode[]): {
    selectedNode: WorkerNode;
    reason: string;
    confidence: number;
  } {
    // Simple round robin based on request count
    const sortedNodes = nodes.sort((a, b) => {
      const aRequests = this.getNodeRequestCount(a.id);
      const bRequests = this.getNodeRequestCount(b.id);
      return aRequests - bRequests;
    });

    const selectedNode = sortedNodes[0];
    if (!selectedNode) {
      throw new Error('No available nodes for load balancing');
    }

    return {
      selectedNode,
      reason: 'Round robin - least recently used node',
      confidence: 0.7,
    };
  }

  /**
   * Least connections selection
   */
  private leastConnectionsSelection(nodes: WorkerNode[]): {
    selectedNode: WorkerNode;
    reason: string;
    confidence: number;
  } {
    const sortedNodes = nodes.sort((a, b) => a.currentLoad - b.currentLoad);

    const selectedNode = sortedNodes[0];
    if (!selectedNode) {
      throw new Error('No available nodes for load balancing');
    }

    return {
      selectedNode,
      reason: `Least connections - ${selectedNode.currentLoad} active connections`,
      confidence: 0.8,
    };
  }

  /**
   * Weighted round robin selection
   */
  private weightedRoundRobinSelection(nodes: WorkerNode[]): {
    selectedNode: WorkerNode;
    reason: string;
    confidence: number;
  } {
    // Calculate weighted scores
    const weightedNodes = nodes.map(node => ({
      node,
      score: (node.capacity * node.priority) / (node.currentLoad + 1),
    }));

    weightedNodes.sort((a, b) => b.score - a.score);

    const selectedWeightedNode = weightedNodes[0];
    if (!selectedWeightedNode) {
      throw new Error('No available nodes for load balancing');
    }

    return {
      selectedNode: selectedWeightedNode.node,
      reason: `Weighted round robin - highest weighted score: ${selectedWeightedNode.score.toFixed(2)}`,
      confidence: 0.75,
    };
  }

  /**
   * Least response time selection
   */
  private leastResponseTimeSelection(nodes: WorkerNode[]): {
    selectedNode: WorkerNode;
    reason: string;
    confidence: number;
  } {
    const sortedNodes = nodes.sort((a, b) => a.averageResponseTime - b.averageResponseTime);

    const selectedNode = sortedNodes[0];
    if (!selectedNode) {
      throw new Error('No available nodes for load balancing');
    }

    return {
      selectedNode,
      reason: `Least response time - ${selectedNode.averageResponseTime}ms average`,
      confidence: 0.85,
    };
  }

  /**
   * Geographic selection
   */
  private geographicSelection(
    nodes: WorkerNode[],
    workload: BatchWorkload
  ): {
    selectedNode: WorkerNode;
    reason: string;
    confidence: number;
  } {
    // Prefer nodes in the same region
    const sameRegionNodes = nodes.filter(node => node.region === workload.region);

    if (sameRegionNodes.length > 0) {
      const bestNode = sameRegionNodes.sort(
        (a, b) => this.calculateNodeScore(b, workload) - this.calculateNodeScore(a, workload)
      )[0];

      if (!bestNode) {
        throw new Error('No available nodes in the same region');
      }

      return {
        selectedNode: bestNode,
        reason: `Geographic proximity - same region: ${workload.region}`,
        confidence: 0.9,
      };
    }

    // Fallback to best available node
    const bestNode = nodes.sort(
      (a, b) => this.calculateNodeScore(b, workload) - this.calculateNodeScore(a, workload)
    )[0];

    if (!bestNode) {
      throw new Error('No available nodes for geographic selection');
    }

    return {
      selectedNode: bestNode,
      reason: 'Geographic fallback - best available node',
      confidence: 0.6,
    };
  }

  /**
   * Adaptive selection with machine learning-like optimization
   */
  private adaptiveSelection(
    nodes: WorkerNode[],
    workload: BatchWorkload
  ): {
    selectedNode: WorkerNode;
    reason: string;
    confidence: number;
  } {
    // Calculate adaptive scores for each node
    const nodeScores = nodes.map(node => ({
      node,
      score: this.calculateAdaptiveScore(node, workload),
    }));

    nodeScores.sort((a, b) => b.score - a.score);
    const bestNodeScore = nodeScores[0];
    if (!bestNodeScore) {
      throw new Error('No available nodes for adaptive selection');
    }
    const selectedNode = bestNodeScore.node;

    // Update adaptive weights based on historical performance
    this.updateAdaptiveWeights();

    return {
      selectedNode,
      reason: `Adaptive selection - score: ${bestNodeScore.score.toFixed(3)} (capacity: ${selectedNode.capacity}, load: ${selectedNode.currentLoad}, response: ${selectedNode.averageResponseTime}ms)`,
      confidence: 0.95,
    };
  }

  /**
   * Calculate adaptive score for a node
   */
  private calculateAdaptiveScore(node: WorkerNode, workload: BatchWorkload): number {
    const adaptiveWeight = this.adaptiveWeights.get(node.id) || 1.0;
    const baseScore = this.calculateNodeScore(node, workload);

    // Apply adaptive weight
    const adaptiveScore = baseScore * adaptiveWeight;

    // Apply workload-specific adjustments
    let workloadAdjustment = 1.0;

    // Priority adjustment
    if (workload.priority === 'critical' && node.priority > 8) {
      workloadAdjustment *= 1.2;
    } else if (workload.priority === 'low' && node.priority < 5) {
      workloadAdjustment *= 0.8;
    }

    // Complexity adjustment
    const complexityRatio = workload.estimatedComplexity / 100;
    if (complexityRatio > 0.8 && node.capacity > 80) {
      workloadAdjustment *= 1.1;
    }

    // Deadline adjustment
    if (workload.deadline) {
      const timeRemaining = workload.deadline - Date.now();
      if (timeRemaining < 30000 && node.averageResponseTime < 1000) {
        // 30 seconds, 1 second
        workloadAdjustment *= 1.3;
      }
    }

    return adaptiveScore * workloadAdjustment;
  }

  /**
   * Calculate base node score
   */
  private calculateNodeScore(node: WorkerNode, workload: BatchWorkload): number {
    // Base score factors
    const capacityScore = (node.capacity - node.currentLoad) / node.capacity;
    const responseTimeScore = 1 / (1 + node.averageResponseTime / 1000);
    const errorRateScore = 1 - node.errorRate;
    const priorityScore = node.priority / 10;

    // Capability matching
    const capabilityScore = workload.requiredCapabilities.every(cap =>
      node.capabilities.includes(cap)
    )
      ? 1.0
      : 0.5;

    // Health score
    const healthScore = node.status === 'healthy' ? 1.0 : node.status === 'degraded' ? 0.7 : 0.3;

    // Weighted combination
    return (
      capacityScore * 0.3 +
      responseTimeScore * 0.25 +
      errorRateScore * 0.2 +
      priorityScore * 0.1 +
      capabilityScore * 0.1 +
      healthScore * 0.05
    );
  }

  /**
   * Update adaptive weights based on performance
   */
  private updateAdaptiveWeights(): void {
    const recentHistory = this.requestHistory.slice(-100); // Last 100 requests

    this.nodes.forEach((_node, nodeId) => {
      const nodeRequests = recentHistory.filter(req => req.nodeId === nodeId);

      if (nodeRequests.length === 0) return;

      const successRate = nodeRequests.filter(req => req.success).length / nodeRequests.length;
      const avgResponseTime =
        nodeRequests.reduce((sum, req) => sum + req.responseTime, 0) / nodeRequests.length;

      // Calculate performance score
      const performanceScore = successRate * (1 / (1 + avgResponseTime / 1000));

      // Update adaptive weight
      const currentWeight = this.adaptiveWeights.get(nodeId) || 1.0;
      const newWeight = currentWeight * 0.9 + performanceScore * 0.1; // Exponential moving average

      this.adaptiveWeights.set(nodeId, Math.max(0.1, Math.min(2.0, newWeight))); // Clamp between 0.1 and 2.0
    });

    this.metrics.adaptiveAdjustments++;
  }

  /**
   * Get available nodes for workload
   */
  private getAvailableNodes(workload: BatchWorkload): WorkerNode[] {
    return Array.from(this.nodes.values()).filter(node => {
      // Check health status
      if (node.status === 'offline' || node.status === 'unhealthy') {
        return false;
      }

      // Check capacity
      if (node.currentLoad >= node.capacity) {
        return false;
      }

      // Check capabilities
      const hasRequiredCapabilities = workload.requiredCapabilities.every(cap =>
        node.capabilities.includes(cap)
      );

      return hasRequiredCapabilities;
    });
  }

  /**
   * Estimate completion time for workload on node
   */
  private estimateCompletionTime(node: WorkerNode, workload: BatchWorkload): number {
    const baseTime = node.averageResponseTime;
    const complexityMultiplier = 1 + workload.estimatedComplexity / 100;
    const loadMultiplier = 1 + node.currentLoad / node.capacity;

    return baseTime * complexityMultiplier * loadMultiplier;
  }

  /**
   * Get request count for node
   */
  private getNodeRequestCount(nodeId: string): number {
    return this.requestHistory.filter(req => req.nodeId === nodeId).length;
  }

  /**
   * Record request completion
   */
  recordRequest(
    nodeId: string,
    responseTime: number,
    success: boolean,
    workloadSize: number
  ): void {
    this.requestHistory.push({
      timestamp: Date.now(),
      nodeId,
      responseTime,
      success,
      workloadSize,
    });

    // Update node metrics
    const node = this.nodes.get(nodeId);
    if (node) {
      // Update average response time
      node.averageResponseTime = (node.averageResponseTime + responseTime) / 2;

      // Update error rate
      const recentRequests = this.requestHistory
        .filter(req => req.nodeId === nodeId && req.timestamp > Date.now() - 300000) // Last 5 minutes
        .slice(-20); // Last 20 requests

      if (recentRequests.length > 0) {
        const errors = recentRequests.filter(req => !req.success).length;
        node.errorRate = errors / recentRequests.length;
      }
    }

    // Update global metrics
    this.metrics.totalRequests++;
    if (success) {
      this.metrics.successfulRequests++;
    } else {
      this.metrics.failedRequests++;
    }

    // Cleanup old history
    if (this.requestHistory.length > 1000) {
      this.requestHistory = this.requestHistory.slice(-500);
    }
  }

  /**
   * Start health checking
   */
  private startHealthChecking(): void {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthChecks();
    }, 30000); // Every 30 seconds
  }

  /**
   * Perform health checks on all nodes
   */
  private async performHealthChecks(): Promise<void> {
    const healthCheckPromises = Array.from(this.nodes.values()).map(async node => {
      try {
        // Simulate health check (in real implementation, this would be an HTTP request)
        const isHealthy = Math.random() > 0.05; // 95% uptime simulation

        if (isHealthy) {
          if (node.status === 'unhealthy' || node.status === 'offline') {
            node.status = 'healthy';
            console.log(`✅ Node ${node.id} recovered`);
          }
        } else {
          node.status = 'unhealthy';
          console.log(`❌ Node ${node.id} health check failed`);
        }

        node.lastHealthCheck = Date.now();
      } catch (error) {
        node.status = 'offline';
        console.error(`💀 Node ${node.id} is offline:`, error);
      }
    });

    await Promise.allSettled(healthCheckPromises);
  }

  /**
   * Initialize metrics
   */
  private initializeMetrics(): LoadBalancerMetrics {
    return {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      throughput: 0,
      nodeUtilization: {},
      strategyEffectiveness: {},
      adaptiveAdjustments: 0,
    };
  }

  /**
   * Get load balancer metrics
   */
  getMetrics(): LoadBalancerMetrics {
    // Calculate current metrics
    const recentRequests = this.requestHistory.slice(-100);

    if (recentRequests.length > 0) {
      this.metrics.averageResponseTime =
        recentRequests.reduce((sum, req) => sum + req.responseTime, 0) / recentRequests.length;
      this.metrics.throughput = recentRequests.length / 60; // Requests per minute
    }

    // Calculate node utilization
    this.nodes.forEach((node, id) => {
      this.metrics.nodeUtilization[id] = (node.currentLoad / node.capacity) * 100;
    });

    return { ...this.metrics };
  }

  /**
   * Get node status
   */
  getNodeStatus(): WorkerNode[] {
    return Array.from(this.nodes.values());
  }

  /**
   * Update strategy
   */
  updateStrategy(strategy: LoadBalancingStrategy): void {
    this.strategy = strategy;
    console.log(`🔄 Load balancing strategy updated to: ${strategy.name}`);
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    this.nodes.clear();
    this.requestHistory = [];
    this.adaptiveWeights.clear();
  }
}

export default IntelligentLoadBalancer;
