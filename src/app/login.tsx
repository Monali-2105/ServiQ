
import { Link, router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';

const API_URL = 'http://172.18.204.10:5000';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Missing details', 'Please enter your email and password.');
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        Alert.alert(
          'Login failed',
          data.message || 'Invalid email or password.'
        );
        return;
      }

      // Store the JWT token securely
      await SecureStore.setItemAsync('serviq_token', data.token);

      // Save basic user details for later use
      await SecureStore.setItemAsync(
        'serviq_user',
        JSON.stringify(data.user)
      );

      // Navigate according to the account role
      if (data.user.role === 'provider') {
        router.replace('/provider/home');
      } else if (data.user.role === 'user') {
        router.replace('/user/home');
      } else {
        Alert.alert('Login error', 'Unknown account role.');
      }
    } catch (error) {
  console.error('Login error details:', error);

  Alert.alert(
    'Login Debug',
    error instanceof Error
      ? `${error.name}: ${error.message}`
      : String(error)
  );
} finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>ServiQ</Text>

      <Text style={styles.tagline}>
        One Platform. Verified Workers. Fair Opportunities.
      </Text>

      <Text style={styles.title}>Welcome Back</Text>

      
<TextInput
  placeholder="Enter your email"
  placeholderTextColor="#94A3B8"
  value={email}
  onChangeText={setEmail}
  keyboardType="email-address"
  autoCapitalize="none"
  autoCorrect={false}
  style={styles.input}
/>


      
<TextInput
  placeholder="Enter your password"
  placeholderTextColor="#94A3B8"
  value={password}
  onChangeText={setPassword}
  secureTextEntry={true}
  autoCapitalize="none"
  style={styles.input}
/>


      <TouchableOpacity
        style={[styles.button, loading && styles.disabledButton]}
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.buttonText}>Login</Text>
        )}
      </TouchableOpacity>

      <Text style={styles.registerText}>
        Don't have an account?
      </Text>

      <Link href="/register" style={styles.registerLink}>
        Register
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 25,
    backgroundColor: '#F8FAFC',
  },

  logo: {
    fontSize: 38,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#166534',
    marginBottom: 8,
  },

  tagline: {
    textAlign: 'center',
    color: '#64748B',
    marginBottom: 45,
  },

  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 25,
  },

  
input: {
  height: 50,
  borderWidth: 1,
  borderColor: '#CBD5E1',
  borderRadius: 10,
  paddingHorizontal: 14,
  color: '#1E293B',
  backgroundColor: '#FFFFFF',
  fontSize: 16,
},


  button: {
    height: 52,
    backgroundColor: '#166534',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },

  disabledButton: {
    opacity: 0.7,
  },

  buttonText: {
    color: 'white',
    fontSize: 17,
    fontWeight: 'bold',
  },

  registerText: {
    textAlign: 'center',
    marginTop: 25,
    color: '#64748B',
  },

  registerLink: {
    textAlign: 'center',
    marginTop: 8,
    color: '#166534',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
