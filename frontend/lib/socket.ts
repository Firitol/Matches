import { io } from "socket.io-client";

export const createSocket = (token: string) =>
  io(process.env.NEXT_PUBLIC_SOCKET_URL!, { auth: { token }, withCredentials: true });