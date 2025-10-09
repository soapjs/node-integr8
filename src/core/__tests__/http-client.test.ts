import { HttpClient } from '../http-client';
import axios, { AxiosInstance } from 'axios';

jest.mock('axios');

describe('HttpClient', () => {
  let httpClient: HttpClient;
  let mockAxiosInstance: jest.Mocked<AxiosInstance>;

  beforeEach(() => {
    mockAxiosInstance = {
      request: jest.fn()
    } as any;

    (axios.create as jest.Mock).mockReturnValue(mockAxiosInstance);

    httpClient = new HttpClient('http://localhost:3000');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create axios instance with base URL', () => {
      expect(axios.create).toHaveBeenCalledWith({
        baseURL: 'http://localhost:3000',
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'integr8-test-client/1.0.0'
        }
      });
    });

    it('should use default timeout of 30000ms', () => {
      const call = (axios.create as jest.Mock).mock.calls[0][0];
      expect(call.timeout).toBe(30000);
    });

    it('should accept custom timeout', () => {
      new HttpClient('http://localhost:3000', 15000);
      
      const call = (axios.create as jest.Mock).mock.calls[1][0];
      expect(call.timeout).toBe(15000);
    });

    it('should remove trailing slash from baseUrl', () => {
      new HttpClient('http://localhost:3000/');
      
      const call = (axios.create as jest.Mock).mock.calls[1][0];
      expect(call.baseURL).toBe('http://localhost:3000');
    });
  });

  describe('HTTP methods', () => {
    it('should make GET request', async () => {
      mockAxiosInstance.request.mockResolvedValue({
        data: { id: 1 },
        status: 200,
        headers: {}
      });

      const response = await httpClient.get('/users');

      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          validateStatus: expect.any(Function)
        })
      );
      expect(response.data).toEqual({ id: 1 });
      expect(response.status).toBe(200);
    });

    it('should make POST request with data', async () => {
      const requestData = { name: 'John' };
      mockAxiosInstance.request.mockResolvedValue({
        data: { id: 1, ...requestData },
        status: 201,
        headers: {}
      });

      const response = await httpClient.post('/users', requestData);

      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          data: requestData
        })
      );
      expect(response.status).toBe(201);
    });

    it('should make PUT request', async () => {
      const requestData = { name: 'John Updated' };
      mockAxiosInstance.request.mockResolvedValue({
        data: requestData,
        status: 200,
        headers: {}
      });

      await httpClient.put('/users/1', requestData);

      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'PUT',
          data: requestData
        })
      );
    });

    it('should make PATCH request', async () => {
      const requestData = { name: 'John' };
      mockAxiosInstance.request.mockResolvedValue({
        data: requestData,
        status: 200,
        headers: {}
      });

      await httpClient.patch('/users/1', requestData);

      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'PATCH',
          data: requestData
        })
      );
    });

    it('should make DELETE request', async () => {
      mockAxiosInstance.request.mockResolvedValue({
        data: null,
        status: 204,
        headers: {}
      });

      await httpClient.delete('/users/1');

      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'DELETE'
        })
      );
    });
  });

  describe('validateStatus', () => {
    it('should accept all status codes', async () => {
      mockAxiosInstance.request.mockResolvedValue({
        data: { error: 'Not found' },
        status: 404,
        headers: {}
      });

      const response = await httpClient.get('/users/999');

      expect(response.status).toBe(404);
    });
  });

  describe('retry logic', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should retry on network errors', async () => {
      mockAxiosInstance.request
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          data: { success: true },
          status: 200,
          headers: {}
        });

      const promise = httpClient.get('/users', { retries: 2, retryDelay: 100 });
      
      // Fast-forward through retries
      await jest.advanceTimersByTimeAsync(500);
      
      const response = await promise;

      expect(response.status).toBe(200);
      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(3);
    });

    it('should not retry on 4xx client errors (except 408, 429)', async () => {
      const error = {
        response: {
          status: 400,
          data: { error: 'Bad request' }
        }
      };
      
      mockAxiosInstance.request.mockRejectedValue(error);

      await expect(httpClient.get('/users', { retries: 2 })).rejects.toEqual(error);
      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(1);
    });

    it('should retry on 408 Request Timeout', async () => {
      const error = {
        response: {
          status: 408
        }
      };
      
      mockAxiosInstance.request
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce({
          data: { success: true },
          status: 200,
          headers: {}
        });

      const promise = httpClient.get('/users', { retries: 1, retryDelay: 100 });
      await jest.advanceTimersByTimeAsync(200);
      
      const response = await promise;
      expect(response.status).toBe(200);
    });

    it('should retry on 429 Rate Limit', async () => {
      const error = {
        response: {
          status: 429
        }
      };
      
      mockAxiosInstance.request
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce({
          data: { success: true },
          status: 200,
          headers: {}
        });

      const promise = httpClient.get('/users', { retries: 1, retryDelay: 100 });
      await jest.advanceTimersByTimeAsync(200);
      
      const response = await promise;
      expect(response.status).toBe(200);
    });

    it('should use exponential backoff', async () => {
      mockAxiosInstance.request
        .mockRejectedValueOnce(new Error('Error 1'))
        .mockRejectedValueOnce(new Error('Error 2'))
        .mockResolvedValueOnce({
          data: { success: true },
          status: 200,
          headers: {}
        });

      const promise = httpClient.get('/users', { retries: 2, retryDelay: 100 });
      
      // First retry: 100ms * 2^0 = 100ms
      // Second retry: 100ms * 2^1 = 200ms
      await jest.advanceTimersByTimeAsync(400);
      
      await promise;
      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(3);
    });
  });

  describe('response timing', () => {
    it('should include duration in response', async () => {
      mockAxiosInstance.request.mockResolvedValue({
        data: { id: 1 },
        status: 200,
        headers: {}
      });

      const response = await httpClient.get('/users');

      expect(response).toHaveProperty('duration');
      expect(typeof response.duration).toBe('number');
    });
  });

  describe('request options', () => {
    it('should pass custom headers', async () => {
      mockAxiosInstance.request.mockResolvedValue({
        data: {},
        status: 200,
        headers: {}
      });

      await httpClient.get('/users', {
        headers: { 'X-Custom': 'value' }
      });

      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: { 'X-Custom': 'value' }
        })
      );
    });

    it('should pass custom timeout', async () => {
      mockAxiosInstance.request.mockResolvedValue({
        data: {},
        status: 200,
        headers: {}
      });

      await httpClient.get('/users', {
        timeout: 5000
      });

      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          timeout: 5000
        })
      );
    });
  });
});
