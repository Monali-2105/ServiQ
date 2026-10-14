
import { router } from 'expo-router';
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

const API_URL = 'http://172.18.204.10:5000';

export default function RegisterScreen() {
  const [role, setRole] = useState<'user' | 'provider'>('user');
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [serviceType, setServiceType] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    Alert.alert('Debug', 'Updated registration code is running');
    if (
      !name.trim() ||
      !mobile.trim() ||
      !email.trim() ||
      !password
    ) {
      Alert.alert('Missing details', 'Please fill in all required fields.');
      return;
    }

    if (role === 'provider' && !serviceType.trim()) {
      Alert.alert('Missing service', 'Please enter your service or skill.');
      return;
    }

    if (password.length < 8) {
      Alert.alert('Invalid password', 'Password must contain at least 8 characters.');
      return;
    }

    try {
      setLoading(true);

      const payload: {
        name: string;
        mobile: string;
        email: string;
        password: string;
        role: 'user' | 'provider';
        serviceType?: string;
      } = {
        name: name.trim(),
        mobile: mobile.trim(),
        email: email.trim().toLowerCase(),
        password,
        role,
      };

      if (role === 'provider') {
        payload.serviceType = serviceType.trim();
      }

      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        Alert.alert(
          'Registration failed',
          data.message || 'Unable to create your account.'
        );
        return;
      }

      Alert.alert(
        'Success',
        'Your account has been created. Please log in.',
        [
          {
            text: 'Continue',
            onPress: () => router.replace('/login'),
          },
        ]
      );
    } catch (error) {
      console.error('Registration error:', error);

      Alert.alert(
        'Connection error',
        'Could not connect to the ServiQ server. Check your Wi-Fi and backend.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>ServiQ</Text>

      <Text style={styles.title}>Create Account</Text>

      <Text style={styles.subtitle}>
        Join ServiQ and connect with trusted local services.
      </Text>

      <Text style={styles.label}>Register as</Text>

      <View style={styles.roleContainer}>
        <TouchableOpacity
          style={[
            styles.roleButton,
            role === 'user' && styles.selectedRole,
          ]}
          onPress={() => setRole('user')}
          disabled={loading}
        >
          <Text
            style={[
              styles.roleText,
              role === 'user' && styles.selectedRoleText,
            ]}
          >
            👤 User
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.roleButton,
            role === 'provider' && styles.selectedRole,
          ]}
          onPress={() => setRole('provider')}
          disabled={loading}
        >
          <Text
            style={[
              styles.roleText,
              role === 'provider' && styles.selectedRoleText,
            ]}
          >
            🛠 Provider
          </Text>
        </TouchableOpacity>
      </View>

      <TextInput
        placeholder="Full Name"
        style={styles.input}
         placeholderTextColor="#64748B"
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
        editable={!loading}
      />

      <TextInput
        placeholder="Mobile Number"
        style={styles.input}
         placeholderTextColor="#64748B"
        keyboardType="phone-pad"
        value={mobile}
        onChangeText={setMobile}
        editable={!loading}
      />

      <TextInput
        placeholder="Email"
        style={styles.input}
         placeholderTextColor="#64748B"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        value={email}
        onChangeText={setEmail}
        editable={!loading}
      />

      <TextInput
        placeholder="Password (minimum 8 characters)"
        style={styles.input}
         placeholderTextColor="#64748B"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        editable={!loading}
      />

      {role === 'provider' && (
        <TextInput
          placeholder="Service / Skill (e.g. Plumber)"
          style={styles.input}
          placeholderTextColor="#64748B"
          value={serviceType}
          onChangeText={setServiceType}
          editable={!loading}
        />
      )}

      <TouchableOpacity
        style={[
          styles.registerButton,
          loading && styles.disabledButton,
        ]}
        onPress={handleRegister}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.registerButtonText}>
            Create Account
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => router.replace('/login')}
        disabled={loading}
      >
        <Text style={styles.loginText}>
          Already have an account? Login
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 25,
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  logo: {
    fontSize: 36,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#166534',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    color: '#64748B',
    marginBottom: 25,
    lineHeight: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 10,
  },
  roleContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  roleButton: {
    flex: 1,
    height: 50,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  selectedRole: {
    backgroundColor: '#166534',
    borderColor: '#166534',
  },
  roleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
  },
  selectedRoleText: {
    color: 'white',
  },
  
input: {
  height: 50,
  borderWidth: 1,
  borderColor: '#CBD5E1',
  borderRadius: 10,
  paddingHorizontal: 15,
  marginBottom: 12,
  backgroundColor: '#FFFFFF',
  color: '#0F172A',
  fontSize: 16,
},

  registerButton: {
    height: 52,
    backgroundColor: '#166534',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  disabledButton: {
    opacity: 0.7,
  },
  registerButtonText: {
    color: 'white',
    fontSize: 17,
    fontWeight: 'bold',
  },
  loginText: {
    textAlign: 'center',
    color: '#166534',
    marginTop: 20,
    fontWeight: '600',
  },
});
