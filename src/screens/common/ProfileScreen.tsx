import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { fonts, palette, sharedStyles } from '../../theme/theme';

export function ProfileScreen() {
  const { user, logout } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <View style={[sharedStyles.screen, sharedStyles.container]}>
      <Text style={sharedStyles.title}>Mi Perfil</Text>
      <Text style={styles.meta}>Datos de sesión actual</Text>

      <View style={sharedStyles.card}>
        <Text style={styles.row}>Nombre: {user.name}</Text>
        <Text style={styles.row}>Correo: {user.email}</Text>
        <Text style={styles.row}>Rol: {user.role}</Text>
      </View>

      <Pressable style={[sharedStyles.button, sharedStyles.buttonPrimary]} onPress={logout}>
        <Text style={sharedStyles.buttonText}>Cerrar sesión</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  meta: {
    color: '#A4C8DE',
    fontFamily: fonts.regular,
    marginBottom: 12,
  },
  row: {
    color: palette.light,
    fontFamily: fonts.regular,
    marginBottom: 6,
  },
});
