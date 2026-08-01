# Restore Drill Procedure

## Overview
This document outlines the procedure for conducting restore drills to validate backup and recovery capabilities for the Cookie Bite e-commerce platform.

## Objectives
- Validate backup integrity
- Measure actual Recovery Time Objective (RTO)
- Verify Recovery Point Objective (RPO) compliance
- Test restore procedures for different failure scenarios
- Identify and document any issues or improvements needed

## Frequency
- **Full restore drill**: Quarterly
- **Partial restore drill**: Monthly
- **Backup verification**: Weekly

## Prerequisites
- Access to Supabase backup system
- Access to Redis backup system
- Access to file storage backups
- Test environment (staging) for restore testing
- Documented backup schedule and retention policy

## RTO/RPO Targets

### Critical Systems
| System | RTO Target | RPO Target | Priority |
|--------|-----------|-----------|----------|
| Database (Supabase) | 1 hour | 15 minutes | Critical |
| Redis (Rate Limiting) | 30 minutes | 5 minutes | High |
| File Storage (Images/Assets) | 2 hours | 1 hour | High |
| Application Code | 30 minutes | 0 (Git) | High |

### Non-Critical Systems
| System | RTO Target | RPO Target | Priority |
|--------|-----------|-----------|----------|
| Analytics Data | 4 hours | 1 hour | Medium |
| Logs | 8 hours | 4 hours | Low |
| Session Data | 1 hour | 15 minutes | Medium |

## Restore Drill Scenarios

### Scenario 1: Database Restore
**Trigger**: Database corruption or data loss

**Steps**:
1. **Preparation**
   - Document current database state (row counts, last modified dates)
   - Identify the backup point to restore from
   - Notify stakeholders of the drill
   - Set maintenance mode if in production

2. **Execution**
   - Access Supabase dashboard or API
   - Select the appropriate backup point
   - Initiate restore to test environment
   - Monitor restore progress
   - Verify restore completion

3. **Validation**
   - Run data integrity checks
   - Verify row counts match expected values
   - Test critical queries
   - Validate foreign key relationships
   - Check application functionality

4. **Documentation**
   - Record restore start and end times
   - Document any errors encountered
   - Calculate actual RTO
   - Compare with target RTO
   - Note any deviations from procedure

### Scenario 2: Redis Restore
**Trigger**: Redis failure or data loss

**Steps**:
1. **Preparation**
   - Document current Redis state (key counts, memory usage)
   - Identify the backup point (RDB file or snapshot)
   - Prepare Redis instance for restore

2. **Execution**
   - Stop Redis service
   - Replace RDB file with backup
   - Start Redis service
   - Verify Redis is operational
   - Check key counts and data integrity

3. **Validation**
   - Test rate limiting functionality
   - Verify session data
   - Check cache hit rates
   - Monitor Redis performance

4. **Documentation**
   - Record restore duration
   - Document any data loss
   - Calculate actual RPO
   - Note any performance issues

### Scenario 3: File Storage Restore
**Trigger**: File storage corruption or deletion

**Steps**:
1. **Preparation**
   - Document current file counts and storage usage
   - Identify backup location (S3, local, etc.)
   - Prepare storage destination

2. **Execution**
   - Initiate file restore from backup
   - Monitor transfer progress
   - Verify file integrity (checksums)
   - Update file references if paths changed

3. **Validation**
   - Test image loading
   - Verify file accessibility
   - Check CDN propagation
   - Validate file permissions

4. **Documentation**
   - Record restore duration
   - Document any missing files
   - Note any integrity issues
   - Calculate actual RTO

### Scenario 4: Complete System Restore
**Trigger**: Major system failure or disaster

**Steps**:
1. **Preparation**
   - Document complete system state
   - Prepare all backup sources
   - Coordinate with all teams
   - Set up communication channels

2. **Execution**
   - Restore infrastructure (if needed)
   - Restore database
   - Restore Redis
   - Restore file存储
   - Deploy application code
   - Configure environment variables
   - Start services in dependency order

3. **Validation**
   - Run smoke tests
   - Test critical user flows
   - Verify integrations (payment gateways, etc.)
   - Load test if possible
   - Monitor system performance

4. **Documentation**
   - Record total restore time
   - Document each component's restore time
   - Calculate actual RTO for complete system
   - Identify bottlenecks
   - Document lessons learned

## Validation Checklist

### Database Validation
- [ ] Row counts match expected values
- [ ] Critical queries return correct results
- [ ] Foreign key relationships intact
- [ ] Indexes are valid
- [ ] Stored procedures/functions work
- [ ] RLS policies are active
- [ ] Triggers are functioning

### Application Validation
- [ ] Application starts without errors
- [ ] Authentication works
- [ ] Checkout flow functional
- [ ] Payment processing operational
- [ ] Admin panel accessible
- [ ] API endpoints responding
- [ ] No console errors

### Integration Validation
- [ ] Payment gateway connectivity
- [ ] Email service operational
- [ ] SMS service operational (if used)
- [ ] Third-party APIs accessible
- [ ] CDN serving files correctly

## Post-Drill Actions

### Immediate Actions
1. Restore production to normal state if drill was in production
2. Communicate results to stakeholders
3. Document any issues found
4. Create action items for improvements

### Follow-up Actions
1. Review and update RTO/RPO targets if needed
2. Update restore procedures based on lessons learned
3. Schedule next drill
4. Train team on any procedure changes
5. Update disaster recovery documentation

## Success Criteria

A restore drill is considered successful if:
- All critical data is restored without corruption
- Actual RTO meets or exceeds target RTO
- Actual RPO meets or exceeds target RPO
- Application functions normally after restore
- No data loss beyond acceptable RPO
- Procedure documentation is accurate
- Team is trained on the procedure

## Failure Handling

If a restore drill fails:
1. Immediately stop the drill
2. Document the failure point
3. Investigate root cause
4. Implement corrective actions
4. Re-run the drill after corrections
5. Update procedures to prevent recurrence

## Emergency Contacts

| Role | Name | Contact |
|------|------|---------|
| Database Administrator | TBD | TBD |
| DevOps Engineer | TBD | TBD |
| Backend Lead | TBD | TBD |
| CTO | TBD | TBD |

## Related Documents
- [Backup Policy](./backup-policy.md)
- [Incident Response Plan](./incident-response.md)
- [Business Continuity Plan](./business-continuity.md)

## Change Log
| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2026-07-31 | 1.0 | Initial document | System |
