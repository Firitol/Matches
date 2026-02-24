export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  flagged?: boolean;
  createdAt: string;
}