import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { IHttpClient, HttpRequestOptions, HttpResponse } from '../types';

export class HttpClient implements IHttpClient {
  private axiosInstance: AxiosInstance;
  private baseUrl: string;

  constructor(baseUrl: string, defaultTimeout: number = 30000) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    
    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      timeout: defaultTimeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'integr8-test-client/1.0.0'
      }
    });
  }

  async request(options: HttpRequestOptions): Promise<HttpResponse> {
    const startTime = Date.now();
    
    const config: AxiosRequestConfig = {
      method: options.method || 'GET',
      headers: options.headers,
      data: options.body,
      timeout: options.timeout,
      validateStatus: () => true // Don't throw on any status code
    };

    const retries = options.retries || 3;
    const retryDelay = options.retryDelay || 1000;
    
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response: AxiosResponse = await this.axiosInstance.request(config);
        
        return {
          status: response.status,
          headers: response.headers as Record<string, string>,
          data: response.data,
          duration: Date.now() - startTime
        };
      } catch (error: any) {
        lastError = error;
        
        // Don't retry on client errors (4xx) except 408, 429
        if (error.response?.status >= 400 && error.response?.status < 500) {
          if (error.response.status === 408 || error.response.status === 429) {
            // Retry on timeout or rate limit
          } else {
            throw error;
          }
        }
        
        // Don't retry on last attempt
        if (attempt === retries) {
          break;
        }
        
        // Wait before retry
        await this.sleep(retryDelay * Math.pow(2, attempt)); // Exponential backoff
      }
    }
    
    throw lastError || new Error('Request failed');
  }

  async get(url: string, options?: Partial<HttpRequestOptions>): Promise<HttpResponse> {
    return this.request({
      method: 'GET',
      ...options
    });
  }

  async post(url: string, data?: any, options?: Partial<HttpRequestOptions>): Promise<HttpResponse> {
    return this.request({
      method: 'POST',
      body: data,
      ...options
    });
  }

  async put(url: string, data?: any, options?: Partial<HttpRequestOptions>): Promise<HttpResponse> {
    return this.request({
      method: 'PUT',
      body: data,
      ...options
    });
  }

  async delete(url: string, options?: Partial<HttpRequestOptions>): Promise<HttpResponse> {
    return this.request({
      method: 'DELETE',
      ...options
    });
  }

  async patch(url: string, data?: any, options?: Partial<HttpRequestOptions>): Promise<HttpResponse> {
    return this.request({
      method: 'PATCH',
      body: data,
      ...options
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
