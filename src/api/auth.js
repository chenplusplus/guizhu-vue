import request from '@/utils/request'

export const authApi = {
  login: (data) => request.post('/api/auth/login', data),
  logout: () => request.post('/api/auth/logout'),
  current: () => request.get('/api/auth/current')
}