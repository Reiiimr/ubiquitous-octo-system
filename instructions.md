# Project Instructions

## Project Overview

CityVet is a professional, backend-first veterinary clinic information system intended to digitalize and streamline the clinic's operational workflows. The system is expected to eventually support veterinary records, appointments and booking, pet aftercare, dog finding/recovery workflows, clinic information management, and other clinic-specific processes as requirements are gathered and finalized.

The project should be developed as a real-world, maintainable, secure, and extensible system while remaining practical for the actual requirements of the clinic. Development is incremental: implement the current requirement correctly without prematurely implementing future functionality.

## Tech Stack

- [Backend technology]
- [Backend framework]
- [Database / DBMS]
- [Frontend technology — when UI development begins]
- [API architecture / protocol]
- [Authentication / authorization technology]
- [Testing framework]
- [Deployment environment]
- [Include exact versions once finalized]

Do not introduce additional frameworks, libraries, services, databases, or infrastructure unless they are required by the current task or explicitly requested.

## Project Structure

Use the existing project structure and conventions whenever they are already established.

Example structure:

- `/src` — Main application source
- `/src/api` — API endpoints and route handlers
- `/src/controllers` — Request/controller logic
- `/src/services` — Business logic
- `/src/models` — Data models/entities
- `/src/repositories` — Database access layer
- `/src/middleware` — Authentication, authorization, validation, and middleware
- `/src/types` — Shared type definitions
- `/src/utils` — Shared utilities and helpers
- `/src/config` — Application configuration
- `/database` — Database schemas, migrations, or SQL
- `/tests` — Automated tests
- `/docs` — Relevant technical documentation

Only create directories or files that are required by the current implementation.

Do not create speculative files for features that have not yet been requested.

If the actual project structure differs from this example, follow the existing project structure instead of forcing this structure onto the project.

## Coding Conventions

- Follow the conventions already established by the project before introducing new conventions.
- Use clear, descriptive, consistent names for variables, functions, classes, database entities, API endpoints, and files.
- Keep responsibilities separated appropriately between routing, controllers, business logic, data access, validation, and utilities.
- Prefer simple and maintainable implementations over unnecessarily clever abstractions.
- Avoid duplicated business logic.
- Keep database operations explicit and predictable.
- Validate external input before processing or persisting it.
- Enforce important business rules on the backend rather than relying on the frontend.
- Use transactions when multiple related database operations must succeed or fail together.
- Preserve existing behavior unless the current task explicitly requires changing it.
- Do not refactor unrelated code while implementing a specific feature.
- Do not introduce a new architectural pattern unless the current requirement actually benefits from it.
- Do not add dependencies simply because they are available or convenient.
- Write production-oriented code when implementing functionality, not merely illustrative pseudocode.
- Keep implementations appropriately modular without creating unnecessary abstraction layers.
- Maintain compatibility with the existing architecture.
- Prefer explicit behavior over hidden or implicit behavior.
- Keep API responses predictable and consistent.
- Keep error handling structured, safe, and understandable.
- Do not expose secrets, credentials, stack traces, or internal implementation details through production responses.

## Rules (Do Not Break)

### 1. Exact-Command Principle

Treat the user's latest explicit instruction as the primary definition of the current task.

The latest explicit instruction takes precedence over:

- Previous suggestions
- Previous assumptions
- Potential future features
- General best practices that are not required for the current task
- Features mentioned elsewhere but not requested now

Implement the requested functionality rather than interpreting every request as permission to expand the system.

If the user requests:

> "Create the appointment creation API."

Focus on the appointment creation API.

Do not automatically implement:

- Appointment listing
- Appointment editing
- Appointment cancellation
- Appointment dashboard
- Appointment notifications
- Payment processing
- Analytics
- Reports
- Chatbot integration
- Frontend components

unless they are explicitly requested or are genuinely required for the requested functionality.

---

### 2. Scope Containment

Implement the smallest complete solution that correctly satisfies the current request.

Do not unnecessarily add:

- Features
- Endpoints
- Database fields
- Database tables
- Libraries
- Services
- Abstractions
- Refactors
- UI components
- Automation
- Integrations
- Optimizations
- Infrastructure
- Documentation

The fact that something could be useful does not mean it should be implemented now.

Do not spend tokens solving problems that were not requested.

---

### 3. Token and Effort Discipline

Treat tokens, implementation time, and complexity as limited engineering resources.

Allocate the majority of effort to the current task.

For backend-first work, prioritize:

1. Database/data model
2. Business rules
3. Backend logic
4. API contracts
5. Authentication
6. Authorization
7. Validation
8. Error handling
9. Data integrity
10. Security
11. Testing
12. Relevant performance considerations

Do not spend significant response space designing or implementing UI unless UI is explicitly requested.

---

### 4. Backend-First Development

CityVet is developed backend-first.

When implementing a feature, prioritize:

- Data model
- Database relationships
- Database constraints
- Business rules
- Backend services
- API endpoints
- Request/response structures
- Authentication
- Authorization
- Validation
- Error handling
- Transaction integrity
- Auditability where required
- Testing

The backend should be capable of supporting a future professional UI without requiring unnecessary architectural rewrites.

However, future UI requirements do not justify implementing the UI now.

---

### 5. UI Development Rule

Do not implement UI unless the user explicitly requests UI work in the current instruction.

When UI has not been requested, only consider UI-related concerns that materially affect the backend, such as:

- Future workflow requirements
- User experience considerations
- Role-specific pain points
- Required information
- API response requirements
- Navigation implications
- Data that the future UI will need

Do not generate unnecessary:

- HTML
- CSS
- JavaScript UI
- React/Vue components
- Dashboards
- Visual mockups
- Animations
- Styling systems
- Responsive layouts

unless explicitly requested.

If a future UI element needs to be acknowledged, use a concise placeholder:

`[UI PLACEHOLDER — Appointment Status Display]`

Do not implement the actual UI.

---

### 6. No Unrequested Text Emojis

Do not add text emojis or decorative emojis to the application, interface, documentation, responses, status indicators, or examples unless explicitly requested.

If an icon, badge, symbol, or visual indicator may eventually be required, use a placeholder instead.

Example:

`[ICON PLACEHOLDER — Appointment Status]`

Do not substitute an emoji for the placeholder.

---

### 7. Future-Proof Without Overengineering

Design for future compatibility, but implement only the present requirement.

Use this principle:

> Design for what comes next. Implement what is required now.

Future CityVet functionality may include:

- Veterinary records
- Appointment and booking management
- Pet aftercare
- Dog finder/recovery
- Pet profiles
- Vaccination records
- Clinic information management
- Payments
- Notifications
- Reports
- Other clinic-specific workflows

These possibilities may influence the architecture when they materially affect the current feature.

They do not automatically authorize implementation.

---

### 8. Dependency Classification

Before adding a component, classify it internally as one of the following:

**A. Required**

The current feature cannot function correctly without it.

→ Implement it.

**B. Required for correctness or security**

The feature may technically function without it, but doing so would create a significant correctness, security, or data-integrity problem.

→ Implement it.

**C. Future-compatible consideration**

It helps future development but is not necessary now.

→ Consider it architecturally, but normally do not implement it.

**D. Optional enhancement**

It improves the system but is not required.

→ Do not implement unless requested.

**E. Unrelated**

It does not materially contribute to the current request.

→ Ignore it.

---

### 9. Do Not Assume Requirements

Do not silently turn assumptions into requirements.

If an ambiguity does not prevent implementation, use the simplest reasonable interpretation and clearly state the assumption.

If an ambiguity could materially affect:

- Database architecture
- Security
- Business rules
- API behavior
- Financial transactions
- Permissions
- Data integrity

ask for clarification before making a major architectural decision.

Do not ask unnecessary questions when a safe and conventional implementation is obvious.

---

### 10. Existing Code Protection

When modifying existing code:

1. Understand the existing implementation.
2. Identify the exact requested change.
3. Preserve working functionality.
4. Modify only what is necessary.
5. Avoid unrelated refactoring.
6. Do not replace working architecture without justification.
7. Do not rename existing structures without a reason.
8. Do not introduce unnecessary dependencies.

If an existing implementation contains a serious security, correctness, or architectural problem that directly affects the requested task:

1. Identify the problem.
2. Explain the concrete consequence.
3. Apply the smallest necessary correction.
4. Continue with the requested implementation.

Do not use a small requested change as an excuse to rewrite the entire system.

---

### 11. Database Discipline

Database design must prioritize:

- Data integrity
- Appropriate normalization
- Correct relationships
- Foreign keys where appropriate
- Appropriate indexes
- Unique constraints
- Appropriate data types
- Nullability
- Transaction integrity
- Referential integrity
- Auditability where required

Do not add database fields simply because they might become useful later.

Every field should have a current purpose or a clearly justified architectural purpose.

Do not duplicate data without a deliberate reason such as:

- Historical snapshots
- Audit requirements
- Performance requirements
- Immutable records

---

### 12. API Discipline

For each requested API, define only what is necessary:

- Endpoint
- HTTP method
- Authentication requirements
- Authorization requirements
- Request parameters
- Request body
- Validation
- Business logic
- Response structure
- Relevant error responses

Maintain consistent API conventions across CityVet.

Do not create speculative endpoints.

For example, if the current task is:

`POST /appointments`

do not automatically implement:

`GET /appointments`

`PUT /appointments`

`DELETE /appointments`

unless explicitly requested or genuinely required by the current functionality.

---

### 13. Security by Default

Security is mandatory whenever relevant to the current functionality.

Consider applicable risks including:

- Authentication
- Authorization
- Privilege escalation
- SQL injection
- XSS
- CSRF
- Insecure direct object references
- Mass assignment
- Sensitive data exposure
- Password security
- Session security
- File upload security
- API abuse
- Input validation
- Rate limiting where appropriate

Apply security measures proportionate to the actual system.

Do not create elaborate security infrastructure unrelated to the current architecture or requirements.

---

### 14. Validation Discipline

Separate validation into appropriate layers:

**Input Validation**

Determines whether submitted data is syntactically valid.

**Business Validation**

Determines whether the requested operation is allowed by CityVet's rules.

**Database Integrity**

Ensures that valid data can be safely persisted without violating database constraints.

Do not rely exclusively on frontend validation.

---

### 15. Transaction and Concurrency Awareness

When working with:

- Appointments
- Reservations
- Limited slots
- Inventory
- Payments
- Medical records
- Resource allocation
- Other shared resources

consider:

- Race conditions
- Duplicate operations
- Transaction boundaries
- Concurrent requests
- Database locking where appropriate
- Atomic operations

Do not assume that frontend restrictions protect the backend.

Important business rules must be enforced server-side.

---

### 16. Role-Based Access

Always determine the relevant user/role permissions for the requested backend operation.

Consider:

- Who can perform the action?
- Who can view the data?
- Who can modify the data?
- Who can approve it?
- Who can cancel it?
- Who can delete it?
- Which information should each role receive?

Implement only the permissions required by the current specification.

Do not create speculative permissions for hypothetical future workflows.

---

### 17. Professional Does Not Mean Overengineered

"Industrial-level" does not mean automatically using:

- Microservices
- Kubernetes
- Redis
- Message queues
- Multiple databases
- Event-driven architecture
- Complex DevOps infrastructure
- Excessive design patterns
- Excessive abstraction
- Distributed systems

Use advanced architecture only when actual CityVet requirements justify it.

The preferred solution is:

> The simplest architecture that satisfies the requirements professionally and safely.

---

### 18. Response Discipline

When responding to a development request, focus the response around the requested task.

Prefer:

**What is being implemented**

A concise description of the exact scope.

**Required changes**

Only the changes necessary for the task.

**Implementation**

The actual code, schema, configuration, or other requested output.

**Relevant considerations**

Only technical considerations that materially affect the current implementation.

**Future consideration**

Only mention future considerations that materially affect the current architecture.

Do not fill the response with unrelated recommendations.

---

### 19. Code Output Discipline

When code is requested:

- Provide working implementation rather than unnecessary pseudocode.
- Include required supporting code.
- Do not generate unrelated files.
- Do not generate speculative features.
- Follow the existing architecture.
- Keep the implementation maintainable.
- Keep security requirements intact.
- Explain why additional files are necessary when multiple files are required.

If a requested feature requires a supporting component, include it.

If a component is merely convenient or potentially useful later, do not include it.

---

### 20. Change Boundary

For every task, establish this boundary:

`Requested Change → Required Dependencies → Implementation → Validation`

Stop when the boundary has been satisfied.

Do not continue into unrelated improvements.

If additional improvements are discovered, place them under:

`FUTURE / NOT IMPLEMENTED`

unless the user explicitly requests them.

---

### 21. Senior Developer Judgment

Do not blindly follow an instruction when doing so would produce a clearly:

- Broken system
- Insecure implementation
- Contradictory behavior
- Data-integrity problem
- Architecturally harmful implementation

Instead:

1. Identify the issue.
2. Explain the concrete consequence.
3. Provide the smallest correction necessary.
4. Continue with the requested implementation whenever possible.

Do not replace the user's project direction simply because another architecture is personally preferred.

Use professional engineering judgment to improve the requested implementation without hijacking the project scope.

---

### 22. No Unnecessary Refactoring

Do not refactor code merely because it could be cleaner.

Refactoring is justified when:

- The current code prevents the requested feature.
- The current code creates a security issue.
- The current code creates a correctness issue.
- The current structure directly prevents maintainability of the requested change.
- The user explicitly requests refactoring.

Otherwise, preserve the existing implementation.

---

### 23. Final Scope Verification

Before finalizing a response or implementation, internally verify:

- Did I implement exactly what was requested?
- Did I add anything that was not necessary?
- Did I spend tokens on UI that was not requested?
- Did I introduce unnecessary dependencies?
- Did I create speculative features?
- Did I create unnecessary database fields?
- Did I create unnecessary API endpoints?
- Did I modify unrelated code?
- Did I preserve existing functionality?
- Did I consider security where relevant?
- Did I consider data integrity where relevant?
- Did I preserve future compatibility without prematurely implementing future features?
- Can the user clearly identify what changed?

If something is not required for the current task, do not implement it merely because it would be useful.

---

## Common Commands

- Dev: `[project-specific development command]`
- Test: `[project-specific test command]`
- Build: `[project-specific build command]`
- Lint: `[project-specific lint command]`
- Format: `[project-specific format command]`
- Database migration: `[project-specific migration command]`

Do not assume commands that have not been confirmed for the project.

## Current Focus

**Current development priority: Backend-first implementation.**

Focus on the backend architecture, database, business logic, API contracts, authentication, authorization, validation, data integrity, security, and testing required by the current CityVet feature.

The current focus must be updated whenever the active development task changes.

Do not interpret the project-wide future roadmap as the current implementation scope.

Only the user's most recent explicit instruction determines the immediate task.

## Known Issues / Gotchas

- CityVet requirements are still being gathered from the veterinary clinic. Do not invent undocumented clinic workflows and treat them as confirmed requirements.
- Some future features have been discussed conceptually but are not necessarily part of the current implementation.
- Backend development takes priority over UI development unless UI is explicitly requested.
- UI considerations should be preserved architecturally where necessary, but actual UI implementation should be deferred.
- Avoid premature integrations with payment providers, notification services, AI services, mapping services, or other third-party APIs unless the current task explicitly requires them.
- Avoid premature microservices or distributed architecture.
- Do not create database structures solely for hypothetical future features.
- Do not create API endpoints solely because a CRUD operation might eventually be useful.
- Do not treat frontend restrictions as backend security.
- Important business rules must be enforced by the backend.
- Do not expose sensitive information through API responses or production error messages.
- Do not use emojis as substitutes for future UI icons, badges, or status indicators.
- When something is planned but not currently implemented, clearly mark it as `FUTURE / NOT IMPLEMENTED`.
- If an existing implementation already works, do not rewrite it without a concrete reason.
- When requirements are ambiguous, distinguish confirmed requirements from assumptions.
- When an architectural decision has significant long-term consequences, prioritize clarification over guessing.
- "Industrial-level" means professional, secure, maintainable, testable, and reliable; it does not mean unnecessarily complex.
- The project should evolve incrementally. Each implementation should provide a solid foundation for the next feature without prematurely building the next feature.

## Core Development Principle

> **Build what was requested. Build it correctly. Build it securely. Keep the architecture ready for what comes next. Do not build what has not been requested yet.**

> **The latest explicit instruction defines the current implementation scope. The existing architecture defines the constraints. Professional engineering judgment defines necessary dependencies. Future requirements influence architecture only when they materially affect today's implementation.**