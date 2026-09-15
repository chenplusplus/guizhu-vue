// src/api/upload.js
import api from './index';

// 上传图片
export const uploadImage = (file, type = 'product') => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post('/upload/image', formData, {
    params: { type: type },
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    timeout: 60000,
  });
};

// 删除图片
export const deleteImage = (url) => {
  return api.delete('/upload/image', { params: { url } });
};

// 上传文件（3D模型等）
export const uploadFile = (formData, type = 'dataPackage') => {
  return api.post('/upload/file', formData, {
    params: { type },
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 300000,
  });
};

// 删除文件
export const deleteFile = (url) => {
  return api.delete('/upload/file', { params: { url } });
};