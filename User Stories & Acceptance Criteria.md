# User Stories \& Acceptance Criteria - Part A (Automated Dispensing Cabinet)





### **Theme: Authentication (AUTH)**



##### **US-AUTH-01 - Logging into an ADC**

**Traces to:** FR-AUTH-01, FR-AUTH-03, NFR-SEC-01, NFR-SEC-02, NFR-PERF-01, NFR-AUD-01



**As an** Nurse, **I want** to log into the ADC with my own credentials **so that** I can access the cabinet functions I am permitted to use.



**Normal Acceptance Criterion**

&#x09;**Given** the ADC is at the login screen and the user has a valid account

&#x09;**When** the user enters the a valid username and password

&#x09;**Then** the ADC authenticates the user and grants access to their 	permitted functions within 3 seconds

&#x09;**And** the successful login is recorded



**Off Normal Acceptance Criterion**

&#x09;**Given** the ADC is at the login screen

&#x09;**When** the user submits invalid username or password

&#x09;**Then** the ADC denies access within 3 seconds

&#x09;**And** records the failed login attempt

&#x09;**And** protected functions remain inaccessible
























