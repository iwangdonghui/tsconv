# Error Tracking System Documentation

## Overview

The tsconv application now includes a comprehensive error tracking system powered by Sentry, providing real-time error monitoring, performance tracking, and user feedback collection.

## Features

### 🔍 **Error Monitoring**
- **Frontend Error Tracking**: React error boundaries with Sentry integration
- **Backend Error Tracking**: API error monitoring with context
- **Global Error Handlers**: Unhandled errors and promise rejections
- **Resource Loading Errors**: Failed asset loading detection

### 📊 **Performance Monitoring**
- **Web Vitals**: Core Web Vitals tracking
- **Long Task Detection**: Tasks longer than 50ms
- **Layout Shift Monitoring**: Cumulative Layout Shift (CLS) tracking
- **API Response Time**: Slow endpoint detection

### 👥 **User Experience**
- **Error Boundaries**: Graceful error handling with retry options
- **User Feedback**: In-app error reporting
- **Session Replay**: Error reproduction capabilities
- **Breadcrumb Tracking**: User interaction history

### 🛠️ **Development Tools**
- **Error Dashboard**: Real-time error monitoring (dev only)
- **Local Error Storage**: Offline error logging
- **Error Statistics**: Error type analysis
- **Debug Information**: Detailed error context

## Configuration

### Environment Variables

```bash
# Sentry Configuration
VITE_SENTRY_DSN=https://your-dsn@sentry.io/project-id
SENTRY_DSN=https://your-dsn@sentry.io/project-id

# Application Version
VITE_APP_VERSION=1.0.0

# Feature Flags
VITE_ENABLE_ERROR_TRACKING=true
VITE_ENABLE_PERFORMANCE_MONITORING=true
VITE_ENABLE_USER_FEEDBACK=true

# Development Tools
VITE_ENABLE_ERROR_DASHBOARD=true
VITE_ENABLE_DEBUG_MODE=true
```

### Sentry Project Setup

1. **Create Sentry Account**: Visit [sentry.io](https://sentry.io)
2. **Create Project**: Choose React for frontend, Node.js for backend
3. **Get DSN**: Copy the DSN from project settings
4. **Configure Environment**: Add DSN to environment variables

## Usage

### Frontend Error Tracking

```typescript
import { ErrorReporting } from '../lib/sentry';

// Report custom errors
ErrorReporting.reportError(new Error('Custom error'), {
  component: 'TimestampConverter',
  action: 'convert',
  input: userInput,
});

// Report warnings
ErrorReporting.reportWarning('Deprecated API used', {
  api: 'legacy-endpoint',
  replacement: 'new-endpoint',
});

// Add breadcrumbs
ErrorReporting.addBreadcrumb('User clicked convert button', 'ui.click');

// Set user context
ErrorReporting.setUser({
  id: 'user-123',
  email: 'user@example.com',
});
```

### Backend Error Tracking

```typescript
import { ServerErrorReporting } from '../lib/sentry-server';

// Report API errors
ServerErrorReporting.reportApiError(error, {
  endpoint: '/api/convert',
  method: 'POST',
  userId: 'user-123',
  requestId: 'req-456',
});

// Report database errors
ServerErrorReporting.reportDatabaseError(error, {
  operation: 'SELECT',
  table: 'conversions',
  query: 'SELECT * FROM conversions WHERE id = ?',
});

// Report performance issues
ServerErrorReporting.reportPerformanceIssue('Slow query detected', {
  operation: 'database_query',
  duration: 5000,
  threshold: 1000,
});
```

### Error Boundary Usage

```tsx
import { ErrorBoundary } from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary showFeedbackDialog={true}>
      <YourComponent />
    </ErrorBoundary>
  );
}
```

## Error Types

### Frontend Errors
- **Unhandled Errors**: JavaScript runtime errors
- **Promise Rejections**: Unhandled async errors
- **Resource Errors**: Failed asset loading
- **React Errors**: Component rendering errors

### Backend Errors
- **API Errors**: Endpoint failures
- **Database Errors**: Query failures
- **External Service Errors**: Third-party API failures
- **Performance Issues**: Slow responses

## Privacy and Security

### Data Protection
- **PII Filtering**: Automatic removal of sensitive data
- **Header Sanitization**: Sensitive headers redacted
- **Query Sanitization**: SQL queries sanitized
- **Anonymous User IDs**: Privacy-preserving user tracking

### Error Filtering
- **Development Errors**: Filtered in production
- **Network Errors**: Non-actionable errors filtered
- **Extension Errors**: Browser extension errors filtered
- **Script Errors**: Cross-origin script errors filtered

## Monitoring and Alerts

### Sentry Dashboard
- **Error Trends**: Error frequency over time
- **Performance Metrics**: Response time trends
- **User Impact**: Affected user count
- **Release Tracking**: Error correlation with releases

### Custom Alerts
- **Error Rate**: High error rate notifications
- **Performance**: Slow response alerts
- **New Errors**: First-time error notifications
- **User Feedback**: User report notifications

## Development Workflow

### Error Dashboard (Development Only)
- **Real-time Monitoring**: Live error feed
- **Error Statistics**: Type breakdown
- **Local Storage**: Offline error logs
- **Export Functionality**: Error data download

### Testing Error Tracking
```typescript
// Trigger test error
throw new Error('Test error for Sentry');

// Test performance issue
setTimeout(() => {
  // Simulate slow operation
}, 6000);

// Test user feedback
ErrorReporting.reportFeedback({
  message: 'Test feedback',
  url: window.location.href,
});
```

## Best Practices

### Error Reporting
1. **Provide Context**: Include relevant data with errors
2. **Use Breadcrumbs**: Track user actions leading to errors
3. **Set User Context**: Help identify affected users
4. **Filter Noise**: Avoid reporting non-actionable errors

### Performance Monitoring
1. **Set Thresholds**: Define acceptable performance limits
2. **Monitor Trends**: Track performance over time
3. **Correlate with Releases**: Link performance to deployments
4. **User-Centric Metrics**: Focus on user experience

### Privacy Compliance
1. **Review Data**: Regularly audit captured data
2. **Configure Filters**: Ensure sensitive data is filtered
3. **User Consent**: Consider privacy regulations
4. **Data Retention**: Configure appropriate retention periods

## Troubleshooting

### Common Issues

**Sentry Not Initializing**
- Check DSN configuration
- Verify environment variables
- Check network connectivity

**No Errors Reported**
- Verify Sentry is enabled
- Check error filtering rules
- Test with manual error

**Performance Data Missing**
- Check sample rates
- Verify performance monitoring is enabled
- Check browser compatibility

**User Feedback Not Working**
- Verify event ID is captured
- Check feedback API configuration
- Test feedback submission

## Maintenance

### Regular Tasks
1. **Review Error Trends**: Weekly error analysis
2. **Update Filters**: Adjust noise filtering
3. **Performance Review**: Monthly performance analysis
4. **User Feedback**: Review and respond to feedback

### Updates
1. **Sentry SDK**: Keep SDK updated
2. **Configuration**: Review and update settings
3. **Filters**: Adjust based on new error patterns
4. **Documentation**: Keep docs current

## Support

For issues with the error tracking system:
1. Check this documentation
2. Review Sentry documentation
3. Check error dashboard (development)
4. Contact development team
