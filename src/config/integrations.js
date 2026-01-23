/**
 * Integration Configuration
 * Case Study 4: Extensibility & Scalability
 * 
 * Add new integrations here by name. The ServiceRegistry will dynamically load them.
 * This is the ONLY file you need to modify to add/remove integrations.
 */

export const activeIntegrations = [
    'payroll',        // MySQL Payroll System (Default)
    'securityMock',   // Mock Security Badge System (Demo)
];

export default activeIntegrations;
