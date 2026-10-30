import '../../global.css';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SessionProvider, useSession } from '../auth/session';
import { AppDataProvider } from '../data/provider';
import { ThemeRoot } from '../theme';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeRoot>
        <SessionProvider>
          <AppDataProvider>
            <Routes />
          </AppDataProvider>
        </SessionProvider>
      </ThemeRoot>
    </GestureHandlerRootView>
  );
}

function Routes() {
  const { session, recovering } = useSession();
  if (session === undefined) return null;
  const signedIn = session !== null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={signedIn && !recovering}>
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && recovering}>
        <Stack.Screen name="new-password" />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="sign-in" />
      </Stack.Protected>
    </Stack>
  );
}
