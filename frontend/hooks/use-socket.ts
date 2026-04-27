'use client';

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { TOKEN_KEY } from '@/lib/constants';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'http://localhost:8000';

export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;

    const newSocket = io(`${WS_URL}/ws`, {
      auth: { token },
      transports: ['websocket'],
    });

    newSocket.on('connect', () => setConnected(true));
    newSocket.on('disconnect', () => setConnected(false));

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  return { socket, connected };
}
