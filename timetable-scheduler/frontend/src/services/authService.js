import axios from 'axios';

const API_BASE = 'http://localhost:4000/api';

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: false,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  console.log('Token in request for', config.url, ':', token);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    console.log('No token found in localStorage for:', config.url);
  }
  return config;
});

export const login = async (email, password) => {
  try {
    const response = await api.post('/auth/login', { email, password });
    console.log('Login response:', response.data);
    if (response.data.status === 'success') {
      const { user, token } = response.data.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify({ ...user, role: user.role.toLowerCase() }));
      return { ...user, role: user.role.toLowerCase() };
    } else {
      throw new Error(response.data.message || 'Login failed');
    }
  } catch (error) {
    console.error('Login API error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Invalid email or password');
  }
};

export const register = async (username, email, password, role, Deptid, staffId) => {
  const response = await api.post('/auth/register', {
    username,
    email,
    password,
    role: role.toLowerCase(),
    Deptid,
    staffId: staffId ? parseInt(staffId) : null,
  });
  if (response.data.status === 'success') {
    const { user, token } = response.data.data;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify({ ...user, role: user.role.toLowerCase() }));
    return { ...user, role: user.role.toLowerCase() };
  } else {
    throw new Error(response.data.message || 'Registration failed');
  }
};

export const forgotPassword = async (email) => {
  const response = await api.post('/auth/forgot-password', { email });
  if (response.data.status !== 'success') {
    throw new Error(response.data.message || 'Failed to send reset email');
  }
  return response.data.message || 'Reset email sent successfully';
};

export const resetPassword = async (token, password) => {
  const response = await api.post(`/auth/reset-password/${token}`, { password });
  if (response.data.status !== 'success') {
    throw new Error(response.data.message || 'Password reset failed');
  }
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  return response.data.message || 'Password reset successfully';
};

export const logout = async () => {
  console.log('Logout called, clearing localStorage');
  try {
    await api.post('/auth/logout');
  } catch (err) {
    console.error('Logout API error:', err);
  } finally {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('email');
  }
};

export const getCurrentUser = () => {
  const userStr = localStorage.getItem('user');
  console.log('Current user from localStorage:', JSON.parse(userStr));
  return userStr ? JSON.parse(userStr) : null;
  
};

export const getDepartments = async () => {
  const response = await api.get('/departments');
  if (response.data.status === 'success') {
    return response.data.data.map(dept => ({
      Deptid: dept.Deptid,
      deptCode: dept.Deptacronym,
      Deptname: dept.Deptname,
    }));
  } else {
    throw new Error(response.data.message || 'Failed to fetch departments');
  }
};

export { api };