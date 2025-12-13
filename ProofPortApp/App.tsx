import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {MetaMaskProvider} from '@metamask/sdk-react-native';
import {MainScreen, AgeVerifierScreen, MetamaskScreen} from './src/screens';
import type {RootStackParamList} from './src/types';

const Stack = createNativeStackNavigator<RootStackParamList>();

const App: React.FC = () => {
  return (
    <MetaMaskProvider
      sdkOptions={{
        dappMetadata: {
          name: 'ProofPort',
          url: 'https://proofport.app',
          iconUrl: 'https://proofport.app/icon.png',
          scheme: 'proofport',
        },
      }}>
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
            name="Metamask"
            component={MetamaskScreen}
            options={{title: 'Metamask'}}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </MetaMaskProvider>
  );
};

export default App;
