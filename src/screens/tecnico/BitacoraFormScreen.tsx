import { Picker } from '@react-native-picker/picker';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAssignments } from '../../context/AssignmentsContext';
import { fonts, palette, sharedStyles } from '../../theme/theme';

const answersCatalog = ['Cumple', 'No cumple', 'No aplica'];

export function BitacoraFormScreen({ route, navigation }: { route: any; navigation: any }) {
  const { assignmentId } = route.params;
  const { assignments, questionsByType, submitForm } = useAssignments();

  const assignment = assignments.find((item) => item.id === assignmentId);

  const questions = useMemo(
    () => (assignment ? questionsByType[assignment.establishmentType] || [] : []),
    [assignment, questionsByType],
  );

  const [answers, setAnswers] = useState<Record<string, string>>(assignment?.answers || {});

  if (!assignment) {
    return (
      <View style={[sharedStyles.screen, sharedStyles.container]}>
        <Text style={sharedStyles.title}>Asignación no encontrada</Text>
      </View>
    );
  }

  const onSubmit = async () => {
    const isIncomplete = questions.some((question) => !answers[question]);
    if (isIncomplete) {
      Alert.alert('Formulario incompleto', 'Debe responder todas las preguntas.');
      return;
    }

    try {
      await submitForm(assignment.id, answers);
      Alert.alert('Bitácora registrada', 'La visita fue registrada correctamente.', [
        { text: 'Aceptar', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert(
        'No se pudo guardar',
        error instanceof Error ? error.message : 'Error de conexion con la API.',
      );
    }
  };

  return (
    <View style={sharedStyles.screen}>
      <ScrollView contentContainerStyle={sharedStyles.container}>
        <Text style={sharedStyles.title}>Formulario {assignment.establishmentType}</Text>
        <Text style={styles.meta}>
          RBD {assignment.rbd} · {assignment.establishmentName}
        </Text>

        {questions.map((question) => (
          <View key={question} style={sharedStyles.card}>
            <Text style={styles.question}>{question}</Text>
            <View style={styles.pickerBox}>
              <Picker
                dropdownIconColor={palette.cyan}
                selectedValue={answers[question] || ''}
                onValueChange={(value) =>
                  setAnswers((prev) => ({ ...prev, [question]: String(value) }))
                }
                style={styles.picker}
              >
                <Picker.Item label="Seleccione una opción" value="" />
                {answersCatalog.map((option) => (
                  <Picker.Item key={option} label={option} value={option} />
                ))}
              </Picker>
            </View>
          </View>
        ))}

        <Pressable style={[sharedStyles.button, sharedStyles.buttonSuccess]} onPress={onSubmit}>
          <Text style={sharedStyles.buttonText}>Guardar bitácora</Text>
        </Pressable>
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
  question: {
    color: palette.light,
    fontFamily: fonts.semibold,
    marginBottom: 10,
  },
  pickerBox: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1A547D',
    overflow: 'hidden',
    backgroundColor: '#0C2C47',
  },
  picker: {
    color: palette.light,
  },
});
