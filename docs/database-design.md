# Database Design - RSCOE Student & Faculty Grievance Portal

This document outlines the PostgreSQL database architecture, table definitions, relationships, and indexing strategies optimized for security, scalability, and auditing.

---

## 1. Schema Diagram Overview

```text
  [users] ──(1:N)── [complaints] ──(1:N)── [complaint_attachments]
    │                  │
    │ (1:N)            ├──(1:N)── [complaint_comments]
    ▼                  ├──(1:N)── [complaint_assignments]
  [audit_logs]         ├──(1:N)── [complaint_status_history]
                       └──(1:N)── [identity_access_logs]
```

---

## 2. Table Definitions

### 1. `roles`
Stores system permission roles.
```sql
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL, -- 'STUDENT', 'TEACHER', 'HEAD', 'SUPER_ADMIN'
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 2. `departments`
Stores college academic and administrative departments (e.g., Computer Engineering, Administration).
```sql
CREATE TABLE departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    code VARCHAR(10) UNIQUE NOT NULL, -- e.g., 'COMP', 'MECH', 'ADMIN'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 3. `users`
Stores user profile information. Password hashes are stored securely (Bcrypt/Argon2).
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role_id INTEGER NOT NULL REFERENCES roles(id),
    department_id INTEGER REFERENCES departments(id),
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 4. `complaint_categories`
Stores grievance classifications (e.g., Academics, Infrastructure, Fees).
```sql
CREATE TABLE complaint_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 5. `complaints`
The main grievance record. Stores complainant, assignments, metadata, and anonymity toggles.
```sql
CREATE TYPE complaint_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
CREATE TYPE complaint_status AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REJECTED', 'ESCALATED', 'REOPENED');

CREATE TABLE complaints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    complainant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id INTEGER NOT NULL REFERENCES complaint_categories(id),
    priority complaint_priority DEFAULT 'MEDIUM',
    status complaint_status DEFAULT 'SUBMITTED',
    is_anonymous BOOLEAN DEFAULT FALSE,
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMP WITH TIME ZONE,
    closed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 6. `complaint_attachments`
S3 metadata referencing uploaded documents, images, or media files.
```sql
CREATE TABLE complaint_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_key VARCHAR(500) NOT NULL, -- S3 file URL or key path
    file_type VARCHAR(100) NOT NULL,
    file_size INTEGER NOT NULL,
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 7. `complaint_comments`
Chronological discussion threads on a complaint.
```sql
CREATE TABLE complaint_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    content TEXT NOT NULL,
    is_anonymous BOOLEAN DEFAULT FALSE, -- If complainant wants to reply anonymously
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 8. `complaint_assignments`
Tracks assignment history for auditing who managed a grievance.
```sql
CREATE TABLE complaint_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    assigned_by UUID NOT NULL REFERENCES users(id),
    assigned_to UUID NOT NULL REFERENCES users(id),
    notes TEXT,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 9. `complaint_status_history`
Tracks transitions between lifecycle states for metrics (e.g., resolution duration).
```sql
CREATE TABLE complaint_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    old_status complaint_status,
    new_status complaint_status NOT NULL,
    changed_by UUID NOT NULL REFERENCES users(id),
    notes TEXT,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 10. `identity_access_logs`
An immutable log auditing every instance an anonymous complainant's identity was revealed to a Head.
```sql
CREATE TABLE identity_access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID NOT NULL REFERENCES users(id), -- Head who viewed
    complainant_id UUID NOT NULL REFERENCES users(id), -- Student/Teacher revealed
    complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    ip_address VARCHAR(45),
    user_agent VARCHAR(255),
    accessed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 11. `notifications`
Realtime alerts sent to users regarding status changes, assignments, or comments.
```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    action_url VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 12. `feedback`
Post-resolution feedback ratings from complainants.
```sql
CREATE TABLE feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_id UUID UNIQUE NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comments TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 13. `audit_logs`
Logs systemic operations (e.g., configurations changes, user role upgrades).
```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    metadata JSONB,
    ip_address VARCHAR(45),
    user_agent VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

## 3. Indexes & Constraints
To ensure fast analytical lookups and enforce absolute integrity:

*   **Foreign Keys**: Explicit `ON DELETE CASCADE` is set on attachments, comments, and logs when a parent complaint is removed, preventing orphan records.
*   **Performance Indexes**:
    *   Index on `complaints(status, priority)` to speed up dashboard filtering.
    *   Index on `complaints(complainant_id)` to load user dashboard lists instantly.
    *   Hash index on `users(email)` for registration checks.
*   **Security Audits**: The `identity_access_logs` and `audit_logs` table do NOT support update/delete operations from the application layer. Row policies (RLS) block modifications.
