-- Audit table for admin actions
CREATE TABLE adminAuditLogs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    adminId UUID REFERENCES users(id),
    targetUserId UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    oldValue JSONB,
    newValue JSONB,
    ipAddress VARCHAR(45),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_adminAuditLogs_adminId ON adminAuditLogs(adminId);
CREATE INDEX idx_adminAuditLogs_targetUserId ON adminAuditLogs(targetUserId);
CREATE INDEX idx_adminAuditLogs_createdAt ON adminAuditLogs(createdAt);