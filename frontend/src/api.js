import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

export const registerUser = async (data) => {
  const res = await axios.post(`${API_URL}/api/auth/register`, data);
  return res.data;
};

export const getMatches = async (token) => {
  const res = await axios.get(`${API_URL}/api/matches`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};