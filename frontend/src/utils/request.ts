/**
 * HTTP Request Utility
 */
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

class Request {
  private instance: AxiosInstance;
  private baseURL: string = '';

  constructor() {
    // Initialize with empty base URL
    this.instance = axios.create({
      timeout: 6000000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    this.setupInterceptors();
    this.initializeBaseURL();
  }

  /**
   * Initialize base URL from Electron
   */
  private async initializeBaseURL() {
    // Always use localhost for development
    this.baseURL = 'http://127.0.0.1:8765';
    this.instance.defaults.baseURL = this.baseURL;
    console.log('API Base URL:', this.baseURL);

    if (window.electronAPI) {
      try {
        const electronUrl = await window.electronAPI.getPythonUrl();
        if (electronUrl) {
          this.baseURL = electronUrl;
          this.instance.defaults.baseURL = this.baseURL;
          console.log('API Base URL (from Electron):', this.baseURL);
        }
      } catch (error) {
        console.error('Failed to get Python URL from Electron:', error);
      }
    }
  }

  /**
   * Setup request/response interceptors
   */
  private setupInterceptors() {
    // Request interceptor
    this.instance.interceptors.request.use(
      (config) => {
        // Add any auth headers here if needed
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.instance.interceptors.response.use(
      (response) => {
        return response.data;
      },
      (error) => {
        const message = error.response?.data?.detail || error.message || 'Unknown error';
        console.error('API Error:', message);
        return Promise.reject(new Error(message));
      }
    );
  }

  /**
   * GET request
   */
  get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.instance.get(url, config);
  }

  /**
   * POST request
   */
  post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.instance.post(url, data, config);
  }

  /**
   * PUT request
   */
  put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.instance.put(url, data, config);
  }

  /**
   * DELETE request
   */
  delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.instance.delete(url, config);
  }
}

// Export singleton instance
export const request = new Request();
export default request;
