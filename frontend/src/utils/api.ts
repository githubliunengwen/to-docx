/**
 * API Service
 */
import request from './request';

// API Response Types
export interface ConvertResponse {
  success: boolean;
  message: string;
  output_file?: string;
  content_preview?: string;
}

export interface SettingsResponse {
  minio_endpoint: string;
  minio_bucket: string;
  minio_secure: boolean;
  dashscope_configured: boolean;
  output_dir: string;
  supported_audio_formats: string[];
  supported_video_formats: string[];
  supported_ebook_formats: string[];
}

export interface HealthResponse {
  status: string;
  app_name: string;
  version: string;
  minio_connected: boolean;
  dashscope_configured: boolean;
}

// API Service
export const api = {
  /**
   * Convert file to document
   */
  convertFile: (params: {
    file_path: string;
    output_format: 'docx' | 'md';
    title?: string;
    output_filename?: string;
    output_dir?: string;
  }): Promise<ConvertResponse> => {
    return request.post('/api/convert/file', params);
  },

  /**
   * Get settings
   */
  getSettings: (): Promise<SettingsResponse> => {
    return request.get('/api/system/settings');
  },

  /**
   * Update settings
   */
  updateSettings: (params: {
    minio_endpoint?: string;
    minio_access_key?: string;
    minio_secret_key?: string;
    minio_bucket?: string;
    minio_secure?: boolean;
    dashscope_api_key?: string;
    output_dir?: string;
  }): Promise<any> => {
    return request.post('/api/system/settings', params);
  },

  /**
   * Health check
   */
  healthCheck: (): Promise<HealthResponse> => {
    return request.get('/api/system/health');
  },

  /**
   * Convert Markdown to document
   */
  convertMarkdown: (params: {
    content: string;
    output_format: 'docx' | 'md';
    title?: string;
    output_filename?: string;
  }): Promise<ConvertResponse> => {
    return request.post('/api/convert/markdown', params);
  },

  /**
   * Generate mindmap from text
   */
  generateMindmap: (params: {
    content: string;
    output_filename?: string;
  }): Promise<ConvertResponse & { mindmap_url?: string }> => {
    return request.post('/api/mindmap/generate', params);
  }
};

export default api;
