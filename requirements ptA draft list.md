**functional requirements draft list**

• access control enforcement;

&#x09; - Must have password/login security 

&#x09; ~~- Must have a white and black list of users~~

&#x09; - Must track previous users / attempted user logins

&#x09; - Must have different ranks of authorization (higher rank needed 	   for more important contents) (if we can get to it)

• medication dispensing operations;

&#x09; - Must be able to dispense medication

&#x09;	 - Must have a limit for a certain time period (if we can get to it)

&#x09;	 - Must dispense only if authorized user / rank / logins

&#x09;	 - Must have no errors for empty case (send to ptB)

&#x09;	 - Must have no errors for full case (send to ptB)

&#x09;	 - Must dispense selected medication and amount only

&#x09;	 - Must have time delay safe implementation (if we can get to it)

&#x09;	 - Must dispense efficiently

&#x09;	 - Must dispense without error(negligible error)



&#x09; - Must be able to insert medication in the ADC

&#x09;	 - Must have no errors for empty case

&#x09;	 - Must have no errors for full case

&#x09;	 - Must be able to insert efficiently

&#x09;	 - Must insert without error(negligible error)





• inventory updates;

&#x09; - Must update inventory after inserting

&#x09; - Must have intuitive and efficient logging system

&#x09; 	- Manual Logging system

&#x09; ~~- Must take medication only, no foreign objects~~

&#x09; - Must have security settings options for each medication(if we can get to it)

&#x09; - Must have information about temperature, storage 			   conditions, etc? (if we can get to it)

&#x09; - Must update inventory after dispensing

&#x09;	 - Automatically

&#x09; - Must have intuitive and efficient logging system

&#x09;	 - Automatic Logging system

&#x09; - should send to ptB if online/offline	

&#x09;	 - 30s ping to show sign of life

&#x09;	 - send id and contact address to ptB (stay vague for requirements rn, go into detail w implementation)

• local event logging;

&#x09; - Must send activity / faults to ptB

&#x09; - Must have internal log of ADC activity/faults

&#x09; - Must give logs only to authorized users / rank / logins

&#x09; - Must have error/log list of pings attempted to sent / attempted received in case of faults

&#x09; - 

• fault detection;

&#x09; - 4 different types of alarms for different faults: info, warning, error, critical 

&#x09; - 

• operational modes;

&#x09;

• communication with external systems

&#x09; - individual ADCs need to be able to communicate with ptB

&#x09; - ptB should be able to send commands to ADCs (lock, unlock, maintenance, fault etc)

&#x09; - should send logs of used/inserted medication from each system to ptB

&#x09; - 







**non functional requirements draft list**

&#x20;- 













stakeholders + needs list draft list

&#x20;- nurses

&#x09; - Needs to insert medication in the ADC

&#x09; - Needs to withdraw medication from the ADC

&#x09; - Needs to store multiple types of medication in the ADC?

&#x09; - Needs to rely on medication not going missing

&#x09; 	- Needs the system to be secure from unauthorized use

&#x09;		- needs system to have an unbreakable security 				  system

&#x09;		- needs system to have white and black list

&#x09;	- Needs the system to store medication properly

&#x09;	- needs the system to track activities/faults

&#x09;	- Needs system to track who has used ADC

&#x09;	- Needs alert system for unauthorized use

&#x09; - Needs to efficiently withdraw/insert medication w/o hassle

&#x09; - Needs system to quickly fix faults/reset after error or miscalculation

&#x09; - Needs system to indicate which medication(s) are stored

&#x20;- doctors

&#x09; - Needs to know which personnel are using what machines

&#x09; - Needs different level access to the ADCs?



&#x20;- pharmacists

&#x09; - Needs to have different levels of ADC security based on medication type(controlled substance, easily overdosed medication, something mundane)

&#x09; - Needs access to system

&#x09; - Needs secure system to get medication to nurses/doctors/patients



&#x20;- patients + friends or family (not allowed in)

&#x09; - ADC cannot be easily hacked into

&#x09;	- 2FA?

&#x09; - ADC cannot be accessed by family members

&#x20;- technicians / IT Admins

&#x09; - needs to show all activity/faults/users for a large time period

&#x09; - needs to have a backup of all system activity

&#x09; - Easily Fixable/maintained

&#x09; - 

&#x20;- thieves/unauthorized users (not allowed in)

&#x09; - cannot be tampered with

&#x09; - blackbox like coding structure

&#x09; - security system has multiple multimodal checks

&#x09; - camera to show activity?

&#x09; - attempted break-ins are recorded and deocumented and immediately alerted of

&#x09; - 

&#x20;- hospitals (device must be trustful enough to be used by hospital)

&#x09; - Must have a certain percentage proven track record of working in a similar hospital setting

&#x09; - Must 

&#x20;- Law Enforcement (device must track activities/failures)

&#x20;- Inventory Managers (Device should be able to track medication for Part B to give Inventory Managers information)





