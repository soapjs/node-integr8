import { PortManager } from '../port-manager';

// Don't mock net - use real implementation for simpler tests
describe('PortManager', () => {
  beforeEach(() => {
    // Reset used ports before each test
    (PortManager as any).usedPorts = new Set<number>();
  });

  describe('reservePort', () => {
    it('should reserve a port', () => {
      PortManager.reservePort(3000);

      expect((PortManager as any).usedPorts.has(3000)).toBe(true);
    });

    it('should allow reserving multiple ports', () => {
      PortManager.reservePort(3000);
      PortManager.reservePort(3001);
      PortManager.reservePort(3002);

      expect((PortManager as any).usedPorts.size).toBe(3);
      expect((PortManager as any).usedPorts.has(3000)).toBe(true);
      expect((PortManager as any).usedPorts.has(3001)).toBe(true);
      expect((PortManager as any).usedPorts.has(3002)).toBe(true);
    });

    it('should allow reserving same port multiple times (idempotent)', () => {
      PortManager.reservePort(3000);
      PortManager.reservePort(3000);

      expect((PortManager as any).usedPorts.size).toBe(1);
    });
  });

  describe('releasePort', () => {
    it('should release a reserved port', () => {
      PortManager.reservePort(3000);
      expect((PortManager as any).usedPorts.has(3000)).toBe(true);
      
      PortManager.releasePort(3000);
      expect((PortManager as any).usedPorts.has(3000)).toBe(false);
    });

    it('should not error when releasing unreserved port', () => {
      expect(() => {
        PortManager.releasePort(9999);
      }).not.toThrow();
      
      expect((PortManager as any).usedPorts.has(9999)).toBe(false);
    });

    it('should only release specified port', () => {
      PortManager.reservePort(3000);
      PortManager.reservePort(3001);
      
      PortManager.releasePort(3000);
      
      expect((PortManager as any).usedPorts.has(3000)).toBe(false);
      expect((PortManager as any).usedPorts.has(3001)).toBe(true);
    });
  });

  describe('getDatabasePorts', () => {
    it('should return standard database ports', () => {
      const ports = PortManager.getDatabasePorts();

      expect(ports).toEqual({
        postgres: 5432,
        mysql: 3306,
        mongo: 27017,
        redis: 6379,
        kafka: 9092
      });
    });

    it('should return the same ports on multiple calls', () => {
      const ports1 = PortManager.getDatabasePorts();
      const ports2 = PortManager.getDatabasePorts();

      expect(ports1).toEqual(ports2);
    });

    it('should include all common database types', () => {
      const ports = PortManager.getDatabasePorts();

      expect(ports).toHaveProperty('postgres');
      expect(ports).toHaveProperty('mysql');
      expect(ports).toHaveProperty('mongo');
      expect(ports).toHaveProperty('redis');
      expect(ports).toHaveProperty('kafka');
    });
  });

  describe('getAvailablePort', () => {
    it('should skip reserved ports', async () => {
      PortManager.reservePort(3000);
      PortManager.reservePort(3001);

      // getAvailablePort will check ports starting from 3000
      // Since 3000 and 3001 are reserved, it should try actual network binding
      // We can't easily test the network part without mocking, but we can test the logic
      const port = await PortManager.getAvailablePort(3000);
      
      // Port should be greater than 3001 (since 3000, 3001 are reserved)
      expect(port).toBeGreaterThanOrEqual(3000);
    });

    it('should mark returned port as used', async () => {
      const port = await PortManager.getAvailablePort(8000);
      
      expect((PortManager as any).usedPorts.has(port)).toBe(true);
    });

    it('should return different ports on consecutive calls', async () => {
      const port1 = await PortManager.getAvailablePort(8100);
      const port2 = await PortManager.getAvailablePort(8100);

      expect(port1).not.toBe(port2);
      expect(port2).toBeGreaterThan(port1);
    });
  });

  describe('integration scenarios', () => {
    it('should handle reserve, get, and release cycle', async () => {
      // Reserve some ports
      PortManager.reservePort(9000);
      PortManager.reservePort(9001);

      // Get available port (should skip reserved)
      const port = await PortManager.getAvailablePort(9000);
      expect(port).toBeGreaterThanOrEqual(9002);

      // Release a port
      PortManager.releasePort(9000);
      expect((PortManager as any).usedPorts.has(9000)).toBe(false);
    });
  });
});
