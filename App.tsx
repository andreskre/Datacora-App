import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import {
  Montserrat_300Light,
  Montserrat_400Regular,
  Montserrat_600SemiBold,
  Montserrat_700Bold,
} from '@expo-google-fonts/montserrat';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { AuthProvider } from './src/context/AuthContext';
import { AssignmentsProvider } from './src/context/AssignmentsContext';
import { useAuth } from './src/context/AuthContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { palette } from './src/theme/theme';

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: palette.navy,
    card: palette.navy,
    text: palette.light,
    border: palette.deep,
    primary: palette.cyan,
  },
};

export default function App() {
  return (
    <AuthProvider>
      <AssignmentsProvider>
        <RootApp />
      </AssignmentsProvider>
    </AuthProvider>
  );
}

function RootApp() {
  const { initializing } = useAuth();
  const [fontsLoaded] = useFonts({
    Montserrat_300Light,
    Montserrat_400Regular,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
  });

  if (!fontsLoaded || initializing) {
    return (
      <View style={styles.loaderWrap}>
        <ActivityIndicator size="large" color={palette.cyan} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navTheme}>
      <StatusBar style="light" />
      <AppNavigator />
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loaderWrap: {
    flex: 1,
    backgroundColor: palette.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
