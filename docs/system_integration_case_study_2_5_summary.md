# SYSTEM INTEGRATION – CASE STUDY 2, 3, 4, 5

> **Purpose of this document**  
This markdown file summarizes and consolidates the core objectives, responsibilities, deliverables, and architectural mindset required for **Case Study 2, 3, 4, and 5** in the System Integration course.  
It is intended to be used as:
- A learning guide
- A working reference when collaborating with AI Agents
- A foundation for architecture decisions, coding, and documentation

The document focuses on **what must be done, why it is done, and how far it should go**, without exceeding academic scope.

---

## CASE STUDY 2 – THE DASHBOARD

### 1. Core Objective
Develop an **integrated executive dashboard** using **presentation-layer integration**, without modifying existing legacy systems.

The dashboard is designed for:
- Senior management
- Shareholders (view-only)

The system is **read-only** and focused on **decision support**, not operations.

---

### 2. Key Responsibilities

In Case Study 2, the system must:
- Retrieve data from multiple systems (HR & Payroll)
- Present **summarized information** efficiently
- Allow **drill-down** from summary to detail

At this stage, the system:
- Does **not** require real-time synchronization
- Does **not** modify or write data back to legacy systems

---

### 3. Required Functional Capabilities

- Earnings summary (by department, demographics, shareholder status)
- Vacation summary
- Benefits summary
- Drill-down to employee-level details
- Pagination and filtering

---

### 4. Architectural Focus

- Presentation-layer integration
- Middleware API as a data aggregation layer
- Performance prioritized over real-time accuracy

The architecture should clearly show:
- Dashboard → API → Multiple data sources

---

### 5. Deliverables

- Dashboard UI (conceptual or implemented)
- API endpoints for summary and drill-down
- Test plan validating dashboard behavior

---

### 6. What NOT to Do

- Do not implement complex synchronization logic
- Do not redesign legacy schemas
- Do not over-engineer with microservices or streaming

---

## CASE STUDY 3 – INTEGRATED SYSTEM

### 1. Core Objective
Ensure **data consistency** across systems when data is **entered once and distributed** to multiple databases.

This case introduces the challenge of **near real-time integration**.

---

### 2. Key Responsibilities

The system must:
- Identify where data inconsistency can occur
- Explain when and why data may temporarily diverge
- Provide a strategy to restore consistency

Perfect consistency is **not required**, but transparency is.

---

### 3. Architectural Focus

- Data flow between systems
- Middleware orchestration
- Batch or near real-time synchronization

The design must acknowledge:
- Legacy system limitations
- Time constraints

---

### 4. Consistency Considerations

- ACID properties where feasible
- Documented exceptions where ACID is not achievable
- Clear recovery or reconciliation mechanisms

---

### 5. Deliverables

- Integrated system demonstration
- Data synchronization design
- Requirements, design, and test documentation

---

### 6. What NOT to Do

- Do not rebuild the UI
- Do not force real-time distributed transactions
- Do not assume unlimited development time

---

## CASE STUDY 4 – FULLY INTEGRATED SYSTEM

### 1. Core Objective
Design an architecture that supports **future system integration** while maintaining the **appearance of a single system**.

The system should be **extensible and scalable**.

---

### 2. Key Responsibilities

The architecture must:
- Support adding new systems with minimal change
- Centralize integration logic using middleware
- Maintain data consistency across all systems

---

### 3. Architectural Focus

- Middleware-centric architecture
- Loose coupling between systems
- Clear integration interfaces

This case evaluates **architectural thinking**, not coding depth.

---

### 4. Design Considerations

- Minimize changes to existing applications
- Keep UI changes minimal
- Ensure system remains consistent at all times

---

### 5. Deliverables

- Fully integrated architecture design
- Updated requirements and documentation
- Demonstration of integrated behavior

---

### 6. What NOT to Do

- Do not tightly couple systems
- Do not redesign legacy applications
- Do not overbuild implementation details

---

## CASE STUDY 5 – NETWORK INTEGRATION

### 1. Core Objective
Understand how **network infrastructure** supports an integrated system, focusing on **availability, security, and recovery**.

This case shifts from application logic to **infrastructure thinking**.

---

### 2. Key Responsibilities

The system design must address:
- User access over the network
- Authentication and authorization locations
- Network reliability and fault tolerance

---

### 3. Network & Infrastructure Focus

- High-level network topology
- Bandwidth and access considerations
- Security boundaries

---

### 4. Backup & Recovery Strategy

- Identify critical systems
- Define acceptable recovery times
- Propose reasonable backup solutions

Cost-awareness is essential.

---

### 5. Deliverables

- Network integration presentation
- Backup and recovery plan
- Infrastructure requirements document

---

### 6. What NOT to Do

- Do not configure real network devices
- Do not over-specify infrastructure
- Do not ignore cost and practicality

---

## OVERALL PROGRESSION SUMMARY

| Case | Primary Focus | Key Skill Evaluated |
|-----|-------------|-------------------|
| 2 | Data presentation | Integration & usability |
| 3 | Data consistency | System reliability |
| 4 | Scalability | Architecture design |
| 5 | Infrastructure | Operational readiness |

---

## FINAL NOTE

These case studies are **progressive layers of system thinking**:
1. Show the data
2. Keep the data consistent
3. Make the system extensible
4. Ensure the system can operate reliably

Each case must be completed **fully but not excessively**.
