import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { fonts, palette, sharedStyles } from '../../theme/theme';

export function AdminScreen() {
  const { usersList } = useAuth();
  const byRole = usersList.reduce(
    (acc, user) => {
      acc[user.role] += 1;
      return acc;
    },
    { tecnico: 0, jefe_mantencion: 0, jefe_nacional: 0, admin: 0 },
  );

  return (
    <View style={sharedStyles.screen}>
      <ScrollView contentContainerStyle={sharedStyles.container}>
        <Text style={sharedStyles.title}>Administración</Text>
        <Text style={styles.meta}>Gestión de perfiles y control de acceso</Text>

        <View style={sharedStyles.card}>
          <Text style={styles.section}>Usuarios por rol</Text>
          <Text style={styles.row}>Técnico: {byRole.tecnico}</Text>
          <Text style={styles.row}>Jefe de Mantención: {byRole.jefe_mantencion}</Text>
          <Text style={styles.row}>Jefe Nacional: {byRole.jefe_nacional}</Text>
          <Text style={styles.row}>Admin: {byRole.admin}</Text>
        </View>

        <View style={sharedStyles.card}>
          <Text style={styles.section}>Cuentas activas</Text>
          {usersList.map((item) => (
            <Text key={item.id} style={styles.row}>
              {item.name} · {item.role}
            </Text>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  meta: {
    color: '#A4C8DE',
    fontFamily: fonts.regular,
    marginBottom: 12,
  },
  section: {
    color: palette.cyan,
    fontFamily: fonts.semibold,
    marginBottom: 8,
  },
  row: {
    color: '#BCD3E1',
    fontFamily: fonts.regular,
    marginBottom: 4,
  },
});
