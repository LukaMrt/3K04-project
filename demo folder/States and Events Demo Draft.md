# States and Events - Part A (Automated Dispensing Cabinet)







## States



##### Authentication

**Unauthenticated -** no valid user session exists; protected ADC functions unavailable

**Authenticating** - ADC is checking if submitted credentials and user account are valid

**Authenticated** - credentials are valid, valid user session started, protected ADC functions are available

**Login Blocked** - additional login attempts are temporarily blocked due to exceeded login attempts counter









## Events



##### Authentication





**credentialsSubmitted -** user submits username/password

**authenticationSuccess -** credentials and accounts are valid/found

**userSessionStart -** user session is started, protected ADC functions available

**authenticationFail -** username, password, or account are not valid/found

**loginAttemptsReached -** configurable login attempts threshold is reached. 

**lockoutEnabled -** configurable login blocking timer starts

**lockoutExpired -** configurable login blocking timer ends, login attempts reset and available now

**failedAttemptsCleared -** Level 2/3 authorization clears the exceeded login attempts fault, login attempts reset and available now

**sessionExpired -** valid user session ends due to inactivity timer expiring

**userlogOut -** valid user session ends due to user ending their own session









