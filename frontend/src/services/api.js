import axios from "axios";

// Read the backend address from the frontend environment configuration.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

// Attach the logged-in user's token to API requests.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default api;