import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import PinLogin from './PinLogin';

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const token = useSelector((state: RootState) => state.auth.token);

  if (!token) {
    return <PinLogin />;
  }

  return <>{children}</>;
}
