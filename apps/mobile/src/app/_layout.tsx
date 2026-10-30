import { Stack } from 'expo-router';
import { SessionProvider, useSession } from '../auth/session';
import { AppDataProvider } from '../data/provider';

export default function RootLayout() {
  return (
    <SessionProvider>
      <AppDataProvider>
        <Routes />
      </AppDataProvider>
    </SessionProvider>
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
