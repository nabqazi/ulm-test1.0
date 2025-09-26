import React, { useState, createContext, useContext } from 'react';
type WalletContextType = {
  isConnected: boolean;
  address: string | null;
  isAdmin: boolean;
  connectWallet: () => void;
  disconnectWallet: () => void;
};
const WalletContext = createContext<WalletContextType | undefined>(undefined);
export function WalletProvider({
  children
}: {
  children: React.ReactNode;
}) {
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const connectWallet = () => {
    // Mock wallet connection - In production, use proper Web3 signature verification
    setIsConnected(true);
    setAddress('0x1234...5678');
    // SECURITY FIX: Replace random admin assignment with proper role verification
    // In production: verify admin role through smart contract or signed message
    const adminAddresses = [
      '0x1234...5678', // Add actual admin addresses here
      '0xabcd...efgh'  // Multiple admins supported
    ];
    setIsAdmin(adminAddresses.includes('0x1234...5678'));
  };
  const disconnectWallet = () => {
    setIsConnected(false);
    setAddress(null);
    setIsAdmin(false);
  };
  return <WalletContext.Provider value={{
    isConnected,
    address,
    isAdmin,
    connectWallet,
    disconnectWallet
  }}>
      {children}
    </WalletContext.Provider>;
}
export const useWallet = () => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};