import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { fonts, palette, sharedStyles } from '../../theme/theme';

export function LoginScreen() {
  const { login, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const onSubmit = async () => {
    if (!email || !password) {
      setError('Debe ingresar correo y contraseña.');
      return;
    }

    setError('');
    const result = await login({ email, password });
    if (!result.ok) {
      setError(result.message || 'No fue posible iniciar sesión.');
    }
  };

  return (
    <View style={sharedStyles.screen}>
      <LinearGradient
        colors={[palette.navy, '#012744', '#00162A']}
        style={styles.gradient}
      >
        <View style={styles.content}>
          <Image source={require('../../../assets/Logo1.png')} style={styles.logo} />
          <Text style={styles.appName}>Datacora</Text>
          <Text style={styles.headline}>Digitalización de bitácoras de mantenimiento</Text>

          <View style={sharedStyles.card}>
            <Text style={sharedStyles.label}>Correo institucional</Text>
            <TextInput
              style={sharedStyles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="nombre@datacora.cl"
              placeholderTextColor="#8EB2CC"
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <Text style={sharedStyles.label}>Contraseña</Text>
            <View style={styles.passwordWrap}>
              <TextInput
                style={styles.passwordInput}
                value={password}
                onChangeText={setPassword}
                placeholder="Ingrese su contraseña"
                placeholderTextColor="#8EB2CC"
                secureTextEntry={!showPassword}
              />
              <Pressable onPress={() => setShowPassword((prev) => !prev)}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={22}
                  color={palette.cyan}
                />
              </Pressable>
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable style={[sharedStyles.button, sharedStyles.buttonPrimary]} onPress={onSubmit}>
              {loading ? (
                <ActivityIndicator color={palette.navy} />
              ) : (
                <Text style={sharedStyles.buttonText}>Ingresar</Text>
              )}
            </Pressable>
          </View>

          <View style={styles.demoBox}>
            <Text style={styles.demoTitle}>Accesos demo</Text>
            <Text style={styles.demoText}>técnico@datacora.cl / Datacora123</Text>
            <Text style={styles.demoText}>jefe@datacora.cl / Datacora123</Text>
            <Text style={styles.demoText}>nacional@datacora.cl / Datacora123</Text>
            <Text style={styles.demoText}>admin@datacora.cl / Datacora123</Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 58,
    paddingBottom: 28,
  },
  logo: {
    width: 84,
    height: 84,
    marginBottom: 8,
    alignSelf: 'center',
    resizeMode: 'contain',
  },
  appName: {
    color: palette.light,
    fontFamily: fonts.bold,
    fontSize: 30,
    textAlign: 'center',
  },
  headline: {
    color: '#96BED8',
    fontFamily: fonts.regular,
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center',
  },
  passwordWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#0C2C47',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1A547D',
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  passwordInput: {
    flex: 1,
    color: palette.light,
    fontFamily: fonts.regular,
    paddingVertical: 12,
  },
  error: {
    color: palette.danger,
    marginBottom: 10,
    fontFamily: fonts.semibold,
  },
  demoBox: {
    marginTop: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#164565',
    padding: 12,
    backgroundColor: '#06243A',
  },
  demoTitle: {
    color: palette.cyan,
    fontFamily: fonts.semibold,
    marginBottom: 6,
  },
  demoText: {
    color: '#B8D0E0',
    fontFamily: fonts.regular,
    fontSize: 12,
  },
});
