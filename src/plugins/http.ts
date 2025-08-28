import axios from "axios";
import { useAuthStore } from "../stores/auth";

const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000/api",
  withCredentials: false,
});

// Request: injeta Authorization se houver token
http.interceptors.request.use((config) => {
  const auth = useAuthStore();
  const token = auth.token;
  if (token) {
    config.headers = config.headers ?? {};
    (config.headers as any).Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response: se 401, faz logout e redireciona para /login
http.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;
    if (status === 401) {
      const auth = useAuthStore();
      auth.logout();
      if (location.pathname !== "/login") {
        location.assign("/login");
      }
    }
    return Promise.reject(err);
  }
);

export default http;
