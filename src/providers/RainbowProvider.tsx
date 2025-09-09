import '@rainbow-me/rainbowkit/styles.css';
import { type ReactNode } from 'react';
import {
  getDefaultConfig,
  RainbowKitProvider,
} from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import {
  ronin,
} from 'wagmi/chains';
import {
  QueryClientProvider,
  QueryClient,
} from '@tanstack/react-query';

const config = getDefaultConfig({
  appName: 'Qupaca Casino Automation',
  projectId: '<-any-project-id->',
  chains: [ronin],
  ssr: false,
});

const queryClient = new QueryClient();

interface RainbowProviderProps {
  children: ReactNode;
}

export const RainbowProvider = ({ children }: RainbowProviderProps) => {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};
