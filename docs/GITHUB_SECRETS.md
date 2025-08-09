# 🔐 GitHub Secrets Configuration

This document outlines the required GitHub secrets for the CI/CD pipeline to function properly.

## Required Secrets

### Deployment Secrets

#### Vercel Deployment
```
VERCEL_TOKEN
- Description: Vercel authentication token
- How to get: Vercel Dashboard → Settings → Tokens
- Scope: Account-level token with deployment permissions

VERCEL_ORG_ID
- Description: Vercel organization/team ID
- How to get: Vercel Dashboard → Settings → General
- Format: team_xxxxxxxxxxxxxxxxxx

VERCEL_PROJECT_ID
- Description: Vercel project ID
- How to get: Project Settings → General
- Format: prj_xxxxxxxxxxxxxxxxxx
```

#### Cloudflare Pages Deployment
```
CLOUDFLARE_API_TOKEN
- Description: Cloudflare API token with Pages permissions
- How to get: Cloudflare Dashboard → My Profile → API Tokens
- Permissions: Zone:Read, Page:Edit

CLOUDFLARE_ACCOUNT_ID
- Description: Cloudflare account ID
- How to get: Cloudflare Dashboard → Right sidebar
- Format: 32-character hex string
```

### Code Quality Secrets

#### Codecov Integration
```
CODECOV_TOKEN
- Description: Codecov upload token
- How to get: Codecov Dashboard → Repository Settings
- Purpose: Upload test coverage reports
```

### Notification Secrets (Optional)

#### Slack Integration
```
SLACK_WEBHOOK_URL
- Description: Slack webhook for deployment notifications
- How to get: Slack App → Incoming Webhooks
- Purpose: Send build and deployment notifications
```

#### Discord Integration
```
DISCORD_WEBHOOK_URL
- Description: Discord webhook for notifications
- How to get: Discord Server → Integrations → Webhooks
- Purpose: Send build and deployment notifications
```

## Setting Up Secrets

### Repository Secrets
1. Go to your GitHub repository
2. Navigate to Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Add each secret with the exact name and value

### Environment Secrets
For production deployments, consider using environment-specific secrets:

1. Go to Settings → Environments
2. Create environments: `staging`, `production`
3. Add environment-specific secrets
4. Configure protection rules

## Secret Validation

### Testing Secrets
Use the following commands to test if secrets are properly configured:

```bash
# Test Vercel deployment (requires secrets)
vercel --token $VERCEL_TOKEN whoami

# Test Cloudflare API (requires token)
curl -X GET "https://api.cloudflare.com/client/v4/user/tokens/verify" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN"
```

### Secret Security

#### Best Practices
- **Rotate regularly**: Update tokens every 90 days
- **Minimum permissions**: Use least-privilege principle
- **Environment separation**: Different tokens for staging/production
- **Monitor usage**: Track token usage in service dashboards

#### Security Checklist
- [ ] Tokens have minimum required permissions
- [ ] Tokens are environment-specific where possible
- [ ] Token rotation schedule is established
- [ ] Access is monitored and logged
- [ ] Backup access method is available

## Troubleshooting

### Common Issues

#### Vercel Deployment Fails
```
Error: Invalid token or insufficient permissions
Solution: 
1. Verify VERCEL_TOKEN is valid
2. Check token has deployment permissions
3. Ensure VERCEL_ORG_ID and VERCEL_PROJECT_ID are correct
```

#### Cloudflare Deployment Fails
```
Error: Authentication failed
Solution:
1. Verify CLOUDFLARE_API_TOKEN permissions
2. Check CLOUDFLARE_ACCOUNT_ID is correct
3. Ensure token has Pages:Edit permission
```

#### Codecov Upload Fails
```
Error: Repository not found or token invalid
Solution:
1. Verify CODECOV_TOKEN is for correct repository
2. Check repository is properly configured in Codecov
3. Ensure token has upload permissions
```

### Debug Commands

#### Check Secret Availability
```yaml
# Add to workflow for debugging
- name: Check secrets
  run: |
    echo "VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN != '' }}"
    echo "VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID != '' }}"
    echo "VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID != '' }}"
```

#### Validate Token Format
```bash
# Vercel token format: starts with 'vercel_'
echo $VERCEL_TOKEN | grep -E '^vercel_[a-zA-Z0-9]{24}$'

# Cloudflare token format: 40 character hex
echo $CLOUDFLARE_API_TOKEN | grep -E '^[a-f0-9]{40}$'
```

## Security Considerations

### Token Management
- **Scope limitation**: Use project-specific tokens when possible
- **Time-based rotation**: Implement automatic token rotation
- **Access monitoring**: Monitor token usage patterns
- **Incident response**: Have token revocation procedures

### Environment Isolation
- **Separate tokens**: Different tokens for different environments
- **Access control**: Limit who can view/modify secrets
- **Audit logging**: Track secret access and modifications
- **Backup procedures**: Maintain secure backup of critical tokens

### Compliance
- **Data protection**: Ensure tokens comply with data protection regulations
- **Access logs**: Maintain audit trails for compliance
- **Regular reviews**: Periodic security reviews of token usage
- **Documentation**: Keep security documentation up to date

## Automation

### Secret Rotation Script
```bash
#!/bin/bash
# rotate-secrets.sh - Automated secret rotation

# Rotate Vercel token
NEW_VERCEL_TOKEN=$(vercel tokens create --name "ci-cd-$(date +%Y%m%d)")
gh secret set VERCEL_TOKEN --body "$NEW_VERCEL_TOKEN"

# Rotate Cloudflare token
# (Manual process - requires Cloudflare dashboard)
echo "Please rotate Cloudflare token manually"

echo "Secret rotation completed"
```

### Monitoring Script
```bash
#!/bin/bash
# monitor-secrets.sh - Check secret health

# Check Vercel token validity
if vercel --token $VERCEL_TOKEN whoami > /dev/null 2>&1; then
  echo "✅ Vercel token is valid"
else
  echo "❌ Vercel token is invalid or expired"
fi

# Check Cloudflare token validity
if curl -s -X GET "https://api.cloudflare.com/client/v4/user/tokens/verify" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" | grep -q '"success":true'; then
  echo "✅ Cloudflare token is valid"
else
  echo "❌ Cloudflare token is invalid or expired"
fi
```

## Emergency Procedures

### Token Compromise
1. **Immediate revocation**: Revoke compromised token immediately
2. **Generate new token**: Create replacement token with same permissions
3. **Update secrets**: Update GitHub secrets with new token
4. **Verify deployment**: Test deployment with new token
5. **Monitor activity**: Watch for any unauthorized usage

### Deployment Failure
1. **Check token validity**: Verify all tokens are valid and not expired
2. **Review permissions**: Ensure tokens have required permissions
3. **Test locally**: Verify deployment works with same tokens locally
4. **Rollback if needed**: Use previous working deployment if critical

### Access Recovery
1. **Use backup tokens**: Switch to backup authentication method
2. **Contact service support**: Reach out to Vercel/Cloudflare support if needed
3. **Document incident**: Record what happened and how it was resolved
4. **Update procedures**: Improve processes based on lessons learned

This secrets configuration ensures secure and reliable CI/CD pipeline operation while maintaining proper security practices and compliance requirements.
