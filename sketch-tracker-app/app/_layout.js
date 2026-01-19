import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: '#f4511e', 
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      {/* This defines our routes. 
        'index' is the login screen. 
        '(tabs)' is the dashboard area.
      */}
      <Stack.Screen name="index" options={{ title: 'Login', headerShown: false }} />
      <Stack.Screen name="register" options={{ title: 'Register', headerShown: true }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} /> 
      <Stack.Screen name="project/[id]" options={{ title: 'Project Details' }} />
      <Stack.Screen name="project/add" options={{ title: 'New Project' }} />
      <Stack.Screen name="snapshot/add" options={{ title: 'Take Snapshot' }} />
    </Stack>
  );
}