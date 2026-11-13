import '../../global.css';
import '../theme/interop';
import { Stack } from 'expo-router';
import { useEffect, useRef } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SessionProvider, useSession } from '../auth/session';
import { ToastProvider, useToast } from '../components/toast';
import { EngineProvider } from '../data/engine';
import { AppDataProvider, useDataReady, useRetryUpload, useSyncStatus } from '../data/provider';
import { reportIncident, startMonitoring, withMonitoring } from '../monitoring';
import { registerServiceWorker } from '../pwa/service-worker';
import { ThemeRoot } from '../theme';

startMonitoring();
registerServiceWorker();

export default withMonitoring(RootLayout);

function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeRoot>
        <SessionProvider>
          <AppDataProvider>
            <ToastProvider>
              <Routes />
            </ToastProvider>
          </AppDataProvider>
        </SessionProvider>
      </ThemeRoot>
    </GestureHandlerRootView>
  );
}

/** Une écriture refusée par le serveur le dit, et se renvoie par « Réessayer » (EF-6.4). */
function RejectedWrites() {
  const { rejections } = useSyncStatus();
  const retry = useRetryUpload();
  const toast = useToast();
  const seen = useRef(rejections);
  useEffect(() => {
    if (rejections > seen.current) {
      toast.show({
        message: 'Pas enregistré',
        error: true,
        action: { label: 'Réessayer', onPress: retry },
      });
    }
    seen.current = rejections;
  }, [rejections, retry, toast]);
  return null;
}

/** Une base qui ne s'ouvre pas ou une synchro qui échoue part dans Sentry, une fois par cause. */
function ReportFailures() {
  const { failure } = useSyncStatus();
  useEffect(() => {
    if (failure !== null) reportIncident('Données inaccessibles sur l’appareil', { failure });
  }, [failure]);
  return null;
}

function Routes() {
  const { session, recovery } = useSession();
  const dataReady = useDataReady();
  if (session === undefined) return null;
  const signedIn = session !== null;

  const stack = (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected
        guard={signedIn && recovery === null}
        redirectTo={signedIn ? '/new-password' : '/sign-in'}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="recipe-edit" />
        <Stack.Screen name="categories" />
      </Stack.Protected>
      <Stack.Protected
        guard={signedIn && recovery !== null}
        redirectTo={signedIn ? '/' : '/sign-in'}
      >
        <Stack.Screen name="new-password" />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn} redirectTo="/">
        <Stack.Screen name="sign-in" />
        <Stack.Screen name="sign-up" />
        <Stack.Screen name="check-email" />
        <Stack.Screen name="forgot-password" />
        <Stack.Screen name="reset-sent" />
        <Stack.Screen name="link-expired" />
      </Stack.Protected>
      <Stack.Screen name="auth/confirm" />
      <Stack.Screen name="gallery" />
    </Stack>
  );
  if (!signedIn) return stack;
  if (!dataReady) return null;
  return (
    <EngineProvider>
      <RejectedWrites />
      <ReportFailures />
      {stack}
    </EngineProvider>
  );
}
