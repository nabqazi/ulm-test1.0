import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { Routes, Route } from 'react-router-dom';

import { config } from '../wagmi';
import { WalletProvider } from './context/WalletContext';
import { Layout } from './components/layout/Layout';

// Import page components
import Home from './pages/Home';
import About from './pages/About';
import Browse from './pages/Browse';
import Admin from './pages/Admin';
import User from './pages/User';
import PropertyDetail from './pages/PropertyDetail';

const client = new QueryClient();

function App() {
  return (
      <WagmiProvider config={config}>
        <QueryClientProvider client={client}>
          <RainbowKitProvider>
            <WalletProvider>
              <Layout>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/home" element={<Home />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/browse" element={<Browse />} />
                  <Route path="/admin" element={<Admin />} />
                  <Route path="/user" element={<User />} />
                  <Route path="/property/:id" element={<PropertyDetail />} />
                </Routes>
              </Layout>
            </WalletProvider>
          </RainbowKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
  );
}

export default App;
