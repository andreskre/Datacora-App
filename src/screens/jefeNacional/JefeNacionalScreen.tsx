import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAssignments } from '../../context/AssignmentsContext';
import { fonts, palette, sharedStyles } from '../../theme/theme';

export function JefeNacionalScreen() {
  const { assignments, getByStatus } = useAssignments();
  const pending = getByStatus('pendiente').length;
  const done = getByStatus('completada').length;

  const byType = assignments.reduce(
    (acc, item) => {
      acc[item.establishmentType] += 1;
      return acc;
    },
    { JUNAEB: 0, JUNJI: 0, INTEGRA: 0 },
  );

  return (
    <View style={sharedStyles.screen}>
      <ScrollView contentContainerStyle={sharedStyles.container}>
        <Text style={sharedStyles.title}>Vista Nacional</Text>
        <Text style={styles.meta}>Seguimiento de mantenimiento a nivel país</Text>

        <View style={styles.row}>
          <View style={[sharedStyles.card, styles.kpiCard]}>
            <Text style={styles.kpiLabel}>Pendientes</Text>
            <Text style={styles.kpiValue}>{pending}</Text>
          </View>
          <View style={[sharedStyles.card, styles.kpiCard]}>
            <Text style={styles.kpiLabel}>Completadas</Text>
            <Text style={[styles.kpiValue, { color: palette.green }]}>{done}</Text>
          </View>
        </View>

        <View style={sharedStyles.card}>
          <Text style={styles.blockTitle}>Distribución por tipo</Text>
          <Text style={styles.line}>JUNAEB: {byType.JUNAEB}</Text>
          <Text style={styles.line}>JUNJI: {byType.JUNJI}</Text>
          <Text style={styles.line}>INTEGRA: {byType.INTEGRA}</Text>
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
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  kpiCard: {
    flex: 1,
  },
  kpiLabel: {
    color: '#9FC4DA',
    fontFamily: fonts.regular,
  },
  kpiValue: {
    color: palette.cyan,
    fontFamily: fonts.bold,
    fontSize: 30,
    marginTop: 6,
  },
  blockTitle: {
    color: palette.light,
    fontFamily: fonts.semibold,
    marginBottom: 10,
  },
  line: {
    color: '#BCD3E1',
    fontFamily: fonts.regular,
    marginBottom: 4,
  },
});
