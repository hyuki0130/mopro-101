// AppKit config must be imported first
import './src/config/AppKitConfig';

import React, {useState} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {AppKitProvider, AppKit} from '@reown/appkit-react-native';
import {PrivyProvider} from '@privy-io/expo';
import {appKit, PRIVY_APP_ID, PRIVY_CLIENT_ID} from './src/config';
import {
  MainScreen,
  AgeVerifierScreen,
  CoinbaseKycScreen,
  PrivyWalletScreen,
  LoadingScreen,
} from './src/screens';
import type {RootStackParamList} from './src/types';

const Stack = createNativeStackNavigator<RootStackParamList>();

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);

  if (isLoading) {
    return (
      <SafeAreaProvider>
        <LoadingScreen onReady={() => setIsLoading(false)} />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <PrivyProvider appId={PRIVY_APP_ID} clientId={PRIVY_CLIENT_ID}>
        <AppKitProvider instance={appKit}>
          <NavigationContainer>
            <Stack.Navigator
              initialRouteName="Main"
              screenOptions={{
                headerStyle: {
                  backgroundColor: '#F5F5F5',
                },
                headerTintColor: '#333',
                headerTitleStyle: {
                  fontWeight: '600',
                },
              }}>
              <Stack.Screen
                name="Main"
                component={MainScreen}
                options={{headerShown: false}}
              />
              <Stack.Screen
                name="AgeVerifier"
                component={AgeVerifierScreen}
                options={{title: 'Age Verifier'}}
              />
              <Stack.Screen
                name="CoinbaseKyc"
                component={CoinbaseKycScreen}
                options={{title: 'Coinbase KYC'}}
              />
              <Stack.Screen
                name="PrivyWallet"
                component={PrivyWalletScreen}
                options={{title: 'Wallet'}}
              />
            </Stack.Navigator>
          </NavigationContainer>
          <AppKit />
        </AppKitProvider>
      </PrivyProvider>
    </SafeAreaProvider>
  );
};

export default App;
