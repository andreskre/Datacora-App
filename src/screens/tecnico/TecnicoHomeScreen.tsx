import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useAssignments } from '../../context/AssignmentsContext';
import { fonts, palette, sharedStyles } from '../../theme/theme';

export function TecnicoHomeScreen({ navigation }: { navigation: any }) {
  const { user } = useAuth();
  const { getAssignmentsByUser } = useAssignments();

  if (!user) {
    return null;
  }

  const myAssignments = getAssignmentsByUser(user.id);

  return (
    <View style={sharedStyles.screen}>
      <LinearGradient colors={['#00162A', '#012C49']} style={styles.header}>
        <Text style={sharedStyles.title}>Mis Asignaciones</Text>
        <Text style={sharedStyles.subtitle}>
          {user.name} · Técnico · {myAssignments.length} asignaciones
        </Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={sharedStyles.container}>
        {myAssignments.map((item) => (
          <View key={item.id} style={sharedStyles.card}>
            <Text style={styles.rbd}>RBD {item.rbd}</Text>
            <Text style={styles.name}>{item.establishmentName}</Text>
            <Text style={styles.meta}>{item.establishmentType}</Text>
            <Text style={[styles.state, item.status === 'completada' ? styles.done : styles.pending]}>
              {item.status.toUpperCase()}
            </Text>

            <Pressable
              style={[
                sharedStyles.button,
                item.status === 'completada' ? sharedStyles.buttonSuccess : sharedStyles.buttonPrimary,
              ]}
              onPress={() => navigation.navigate('FormularioBitacora', { assignmentId: item.id })}
            >
              <Text style={sharedStyles.buttonText}>
                {item.status === 'completada' ? 'Ver respuesta' : 'Completar bitácora'}
              </Text>
            </Pressable>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 58,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
  },
  rbd: {
    color: palette.cyan,
    fontFamily: fonts.semibold,
    fontSize: 13,
  },
  name: {
    color: palette.light,
    fontFamily: fonts.bold,
    fontSize: 18,
    marginTop: 4,
  },
  meta: {
    color: '#9EC5DC',
    fontFamily: fonts.regular,
    marginBottom: 10,
  },
  state: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 12,
    fontFamily: fonts.semibold,
    fontSize: 12,
  },
  done: {
    backgroundColor: 'rgba(34,197,94,0.25)',
    color: palette.green,
  },
  pending: {
    backgroundColor: 'rgba(0,180,216,0.2)',
    color: palette.cyan,
  },
});
