import axios from 'axios';

// Create a base instance pointing to your Spring Boot server
const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api',
    withCredentials: true,
});

// This intercepts every request BEFORE it leaves React
api.interceptors.request.use(
    (config) => {
        // Look for the token in the browser's local storage
        const token = localStorage.getItem('token');

        // If it exists, attach it to the header!
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default api;