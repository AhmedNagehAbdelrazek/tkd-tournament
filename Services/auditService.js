const { AuditLog } = require('../Models');
const { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } = require('../config/constants');

async function logAudit({ actorId, action, entityType, entityId, metadata = null }) {
  try {
    await AuditLog.create({
      actorId,
      action,
      entityType,
      entityId,
      metadata,
    });
  } catch (err) {
    console.error('[AuditLog] Failed to write audit record:', err.message);
  }
}

module.exports = { logAudit, AUDIT_ACTIONS, AUDIT_ENTITY_TYPES };
