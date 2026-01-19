import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useFocusEffect } from 'expo-router';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_URL } from '../../config';

export default function StatsScreen() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      fetchStats();
    }, [])
  );

  const fetchStats = async () => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      const response = await axios.get(`${API_URL}/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#f4511e" /></View>;

  return (
    <View style={styles.container}>
      <Text style={styles.header}>My Sketch Stats</Text>
      
      <View style={styles.card}>
        <Text style={styles.number}>{stats?.totalProjects || 0}</Text>
        <Text style={styles.label}>Active Projects</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.number}>{stats?.totalSnapshots || 0}</Text>
        <Text style={styles.label}>Total Snapshots Taken</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.number}>{stats?.averageScore || '0.00'}</Text>
        <Text style={styles.label}>Avg. Similarity Score</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { fontSize: 28, fontWeight: 'bold', marginBottom: 30, color: '#333', textAlign: 'center' },
  
  card: {
    backgroundColor: '#fff', padding: 30, borderRadius: 15, marginBottom: 20, alignItems: 'center',
    elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4
  },
  number: { fontSize: 40, fontWeight: 'bold', color: '#f4511e', marginBottom: 5 },
  label: { fontSize: 16, color: '#666' }
});