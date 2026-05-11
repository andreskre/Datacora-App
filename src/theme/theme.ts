import { StyleSheet } from 'react-native';

export const palette = {
  navy: '#00162A',
  cyan: '#00B4D8',
  green: '#22C55E',
  light: '#E6EDF3',
  deep: '#0A2740',
  danger: '#EF4444',
};

export const fonts = {
  light: 'Montserrat_300Light',
  regular: 'Montserrat_400Regular',
  semibold: 'Montserrat_600SemiBold',
  bold: 'Montserrat_700Bold',
};

export const sharedStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: palette.navy,
  },
  container: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    color: palette.light,
    fontFamily: fonts.bold,
    fontSize: 28,
    letterSpacing: 0.2,
  },
  subtitle: {
    color: '#B5C9D8',
    fontFamily: fonts.regular,
    fontSize: 14,
  },
  card: {
    borderRadius: 18,
    backgroundColor: '#08233A',
    borderWidth: 1,
    borderColor: '#124367',
    padding: 16,
    marginBottom: 12,
  },
  label: {
    color: palette.light,
    fontFamily: fonts.semibold,
    fontSize: 13,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#0C2C47',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1A547D',
    color: palette.light,
    fontFamily: fonts.regular,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  button: {
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimary: {
    backgroundColor: palette.cyan,
  },
  buttonSuccess: {
    backgroundColor: palette.green,
  },
  buttonText: {
    color: palette.navy,
    fontFamily: fonts.semibold,
    fontSize: 15,
  },
});
