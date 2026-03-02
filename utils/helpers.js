// utils/helpers.js
const formatDate = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric'
  });
};

const truncateText = (text, length) => {
  if (!text) return '';
  return text.length > length ? text.substring(0, length) + '...' : text;
};

const getAvatarEmoji = (username) => {
  if (!username) return '👤';
  const emojis = ['😀', '😊', '🥰', '😎', '🤩', '🙋', '💁', '👩', '👨', '🧑', '🦁', '🐘', '🦒', '🦓', '🐆'];
  const index = username.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % emojis.length;
  return emojis[index];
};

const isOnline = (lastActive) => {
  if (!lastActive) return false;
  const minutesAgo = (Date.now() - new Date(lastActive).getTime()) / (1000 * 60);
  return minutesAgo < 10;
};

module.exports = {
  formatDate,
  truncateText,
  getAvatarEmoji,
  isOnline
};
