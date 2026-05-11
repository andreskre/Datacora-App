import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { AdminScreen } from '../screens/admin/AdminScreen';
import { LoginScreen } from '../screens/common/LoginScreen';
import { ProfileScreen } from '../screens/common/ProfileScreen';
import { JefeMantencionScreen } from '../screens/jefe/JefeMantencionScreen';
import { JefeNacionalScreen } from '../screens/jefeNacional/JefeNacionalScreen';
import { BitacoraFormScreen } from '../screens/tecnico/BitacoraFormScreen';
import { TecnicoHomeScreen } from '../screens/tecnico/TecnicoHomeScreen';
import { palette } from '../theme/theme';

type RootStackParamList = {
  Login: undefined;
  AppTabs: undefined;
  TecnicoHome: undefined;
  FormularioBitacora: { assignmentId: string };
};

const RootStack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();
const TecnicoStack = createNativeStackNavigator();

function TecnicoNavigator() {
  return (
    <TecnicoStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: palette.navy },
        headerTintColor: palette.light,
      }}
    >
      <TecnicoStack.Screen
        name="TecnicoHome"
        component={TecnicoHomeScreen}
        options={{ title: 'Asignaciones' }}
      />
      <TecnicoStack.Screen
        name="FormularioBitacora"
        component={BitacoraFormScreen}
        options={{ title: 'Bitácora' }}
      />
    </TecnicoStack.Navigator>
  );
}

function RoleTabs() {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: palette.navy },
        headerTintColor: palette.light,
        tabBarStyle: { backgroundColor: '#061F33', borderTopColor: '#154768' },
        tabBarActiveTintColor: palette.cyan,
        tabBarInactiveTintColor: '#8FB2C7',
        tabBarIcon: ({ color, size }) => {
          const iconName =
            route.name === 'Perfil'
              ? 'person-outline'
              : route.name === 'Operación'
                ? 'clipboard-outline'
                : 'stats-chart-outline';

          return <Ionicons name={iconName as never} color={color} size={size} />;
        },
      })}
    >
      {user.role === 'tecnico' ? (
        <Tab.Screen
          name="Operación"
          component={TecnicoNavigator}
          options={{ headerShown: false }}
        />
      ) : null}
      {user.role === 'jefe_mantencion' ? (
        <Tab.Screen name="Operación" component={JefeMantencionScreen} />
      ) : null}
      {user.role === 'jefe_nacional' ? (
        <Tab.Screen name="Operación" component={JefeNacionalScreen} />
      ) : null}
      {user.role === 'admin' ? <Tab.Screen name="Operación" component={AdminScreen} /> : null}
      <Tab.Screen name="Perfil" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export function AppNavigator() {
  const { user } = useAuth();

  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      {!user ? (
        <RootStack.Screen name="Login" component={LoginScreen} />
      ) : (
        <RootStack.Screen name="AppTabs" component={RoleTabs} />
      )}
    </RootStack.Navigator>
  );
}
