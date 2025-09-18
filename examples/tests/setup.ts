// Global test setup for integr8 examples

// Extend Jest matchers
expect.extend({
  toHaveProperty(received: any, property: string, value?: any) {
    const hasProperty = received && typeof received === 'object' && property in received;
    
    if (!hasProperty) {
      return {
        message: () => `Expected object to have property "${property}"`,
        pass: false,
      };
    }
    
    if (value !== undefined) {
      const actualValue = received[property];
      if (actualValue !== value) {
        return {
          message: () => `Expected property "${property}" to be ${value}, but got ${actualValue}`,
          pass: false,
        };
      }
    }
    
    return {
      message: () => `Expected object not to have property "${property}"`,
      pass: true,
    };
  },
});

// Global timeout for integration tests
jest.setTimeout(60000);
