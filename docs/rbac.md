# Role-Based Access Control (RBAC) Specification

This document details the roles and permissions structure designed for the **RSCOE Student & Faculty Grievance Portal**.

---

## 1. System Roles

1.  **STUDENT**: Enrolled students at RSCOE who can file and track their own academic/infrastructure grievances.
2.  **TEACHER**: Faculty members who can report academic/infrastructure issues or personal workplace complaints.
3.  **HEAD**: Authorized department heads (e.g., Computer HOD, Mechanical HOD, Registrar) authorized to review, assign, and resolve grievances inside their designated department.
4.  **SUPER_ADMIN**: Central administrative IT users responsible for managing users, categories, configs, and system-wide audit monitoring.

---

## 2. Permissions Matrix

The following table maps roles to specific system operations:

| Permission / Action | STUDENT | TEACHER | HEAD | SUPER_ADMIN |
| :--- | :---: | :---: | :---: | :---: |
| **Grievances** | | | | |
| Submit own grievance | ✓ | ✓ | ✗ | ✗ |
| View own grievance | ✓ | ✓ | ✓ | ✓ |
| View department-wide grievances | ✗ | ✗ | ✓ | ✓ |
| Edit status of grievances | ✗ | ✗ | ✓ | ✓ |
| Assign grievance to Head/Investigator | ✗ | ✗ | ✓ | ✓ |
| Toggle anonymity settings | ✓ | ✓ | ✗ | ✗ |
| **Comments & Dialog** | | | | |
| Comment on own grievance thread | ✓ | ✓ | ✓ | ✓ |
| Post anonymous reply | ✓ | ✓ | ✗ | ✗ |
| Comment on assigned department grievance | ✗ | ✗ | ✓ | ✓ |
| **Identity Disclosure** | | | | |
| View normal student identity | ✓ | ✓ | ✓ | ✓ |
| View anonymous student identity | ✗ | ✗ | 🛈 (Audited) | ✓ (Audited) |
| Review identity reveal requests | ✗ | ✗ | ✗ | ✓ |
| **System Administration** | | | | |
| Register new users | ✓ | ✓ | ✗ | ✓ |
| Disable/Enable users | ✗ | ✗ | ✗ | ✓ |
| Create/Edit grievance categories | ✗ | ✗ | ✗ | ✓ |
| View system audit logs | ✗ | ✗ | ✗ | ✓ |

*   *Note: "🛈 (Audited)" indicates that identity exposure is restricted, requires a submitted reason, approval from a Super Admin, and generates an immutable access log.*

---

## 3. Server-Side Security Enforcement

The frontend dashboard views adapt based on user roles, but **the frontend must never be considered the security boundary**. The following constraints are enforced at the API layer:

*   **Row-Level Validation**: When requesting `/api/v1/complaints/:id`, the query filter checks if:
    ```sql
    (complainant_id = current_user_id) OR (current_user_role IN ('HEAD', 'SUPER_ADMIN') AND department_id = complaint_department_id)
    ```
*   **Token Expiry & Validation**: Sessions use `HTTP-Only` JWT cookies, preventing Cross-Site Scripting (XSS) token extractions.
*   **Anonymity Redaction**: If `is_anonymous` is true, the SQL adapter returns null values for `complainant_id` and profile details unless requested through the audited reveal procedure.
