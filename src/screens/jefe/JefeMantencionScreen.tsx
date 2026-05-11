import { Picker } from '@react-native-picker/picker';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useAssignments } from '../../context/AssignmentsContext';
import { EstablishmentType } from '../../types';
import { fonts, palette, sharedStyles } from '../../theme/theme';

export function JefeMantencionScreen() {
  const { user, usersList } = useAuth();
  const { assignments, createAssignment } = useAssignments();

  const [rbd, setRbd] = useState('');
  const [establishmentName, setEstablishmentName] = useState('');
  const [establishmentType, setEstablishmentType] = useState<EstablishmentType>('JUNAEB');
  const [assignedTo, setAssignedTo] = useState('');

  const técnicos = useMemo(
    () => usersList.filter((item) => item.role === 'tecnico'),
    [usersList],
  );

  const onAssign = async () => {
    if (!user) {
      return;
    }
    if (!rbd || !establishmentName || !assignedTo) {
      Alert.alert('Datos incompletos', 'Debe completar todos los campos para asignar.');
      return;
    }

    try {
      await createAssignment({
        rbd,
        establishmentName,
        establishmentType,
        assignedTo,
      });

      setRbd('');
      setEstablishmentName('');
      setEstablishmentType('JUNAEB');
      setAssignedTo('');
      Alert.alert('Asignacion creada', 'La visita fue asignada al tecnico.');
    } catch (error) {
      Alert.alert(
        'No se pudo crear',
        error instanceof Error ? error.message : 'Error de conexion con la API.',
      );
    }
  };

  return (
    <View style={sharedStyles.screen}>
      <ScrollView contentContainerStyle={sharedStyles.container}>
        <Text style={sharedStyles.title}>Asignar Visitas</Text>
        <Text style={styles.meta}>Jefe de Mantención · Flujo por RBD</Text>

        <View style={sharedStyles.card}>
          <Text style={sharedStyles.label}>RBD</Text>
          <TextInput
            style={sharedStyles.input}
            placeholder="Ej: 78123-4"
            placeholderTextColor="#8EB2CC"
            value={rbd}
            onChangeText={setRbd}
          />

          <Text style={sharedStyles.label}>Establecimiento</Text>
          <TextInput
            style={sharedStyles.input}
            placeholder="Nombre del establecimiento"
            placeholderTextColor="#8EB2CC"
            value={establishmentName}
            onChangeText={setEstablishmentName}
          />

          <Text style={sharedStyles.label}>Tipo</Text>
          <View style={styles.pickerBox}>
            <Picker
              selectedValue={establishmentType}
              onValueChange={(value) => setEstablishmentType(value as EstablishmentType)}
              style={styles.picker}
              dropdownIconColor={palette.cyan}
            >
              <Picker.Item label="JUNAEB" value="JUNAEB" />
              <Picker.Item label="JUNJI" value="JUNJI" />
              <Picker.Item label="INTEGRA" value="INTEGRA" />
            </Picker>
          </View>

          <Text style={sharedStyles.label}>Técnico asignado</Text>
          <View style={styles.pickerBox}>
            <Picker
              selectedValue={assignedTo}
              onValueChange={(value) => setAssignedTo(String(value))}
              style={styles.picker}
              dropdownIconColor={palette.cyan}
            >
              <Picker.Item label="Seleccione técnico" value="" />
              {técnicos.map((entry) => (
                <Picker.Item key={entry.id} label={entry.name} value={entry.id} />
              ))}
            </Picker>
          </View>

          <Pressable style={[sharedStyles.button, sharedStyles.buttonPrimary]} onPress={onAssign}>
            <Text style={sharedStyles.buttonText}>Asignar visita</Text>
          </Pressable>
        </View>

        <Text style={styles.section}>Asignaciones recientes</Text>
        {assignments.slice(0, 5).map((item) => (
          <View key={item.id} style={sharedStyles.card}>
            <Text style={styles.rowTitle}>{item.establishmentName}</Text>
            <Text style={styles.rowMeta}>
              RBD {item.rbd} · {item.establishmentType} · {item.status}
            </Text>
          </View>
        ))}
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
  pickerBox: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1A547D',
    overflow: 'hidden',
    backgroundColor: '#0C2C47',
    marginBottom: 12,
  },
  picker: {
    color: palette.light,
  },
  section: {
    color: palette.cyan,
    fontFamily: fonts.semibold,
    marginTop: 6,
    marginBottom: 10,
  },
  rowTitle: {
    color: palette.light,
    fontFamily: fonts.semibold,
    fontSize: 16,
  },
  rowMeta: {
    color: '#A3C4D9',
    fontFamily: fonts.regular,
    fontSize: 12,
  },
});
