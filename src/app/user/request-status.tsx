import { StyleSheet, Text, View } from 'react-native';

export default function RequestStatus() {
  return (
    <View style={styles.container}>

      <Text style={styles.icon}>📍</Text>

      <Text style={styles.title}>
        Finding a Provider
      </Text>

      <Text style={styles.description}>
        ServiQ is looking for the nearest available
        service provider for you.
      </Text>

      <View style={styles.loaderBox}>
        <Text style={styles.loaderText}>
          Searching nearby providers...
        </Text>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },

  icon: {
    fontSize: 55,
    marginBottom: 25,
  },

  title: {
    fontSize: 27,
    fontWeight: 'bold',
    textAlign: 'center',
  },

  description: {
    textAlign: 'center',
    color: '#64748B',
    lineHeight: 22,
    marginTop: 15,
  },

  loaderBox: {
    backgroundColor: 'white',
    padding: 18,
    borderRadius: 12,
    marginTop: 30,
  },

  loaderText: {
    color: '#166534',
    fontWeight: '600',
  },
});