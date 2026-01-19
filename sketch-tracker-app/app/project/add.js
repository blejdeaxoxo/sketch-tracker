import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../../config';

export default function AddProject() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [image, setImage] = useState(null);
  const [uploading, setUploading] = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false, 
      quality: 0.8,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert("Permission Refused", "You need to allow camera access.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false, 
      quality: 0.8,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (!title || !image) {
      Alert.alert('Missing Info', 'Please add a title and select a reference image.');
      return;
    }

    setUploading(true);
    try {
      const token = await SecureStore.getItemAsync('userToken');

      const formData = new FormData();
      formData.append('title', title);
      formData.append('category', category);
      
      formData.append('image', {
        uri: image,
        type: 'image/jpeg', 
        name: 'reference_upload.jpg',
      });

      await axios.post(`${API_URL}/projects`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`,
        },
      });

      Alert.alert('Success', 'Project created!');
      router.back();

    } catch (error) {
      console.error(error);
      Alert.alert('Upload Failed', 'Could not create project.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.label}>Project Title</Text>
      <TextInput 
        style={styles.input} 
        placeholder="e.g. Hand Study" 
        value={title} 
        onChangeText={setTitle} 
      />

      <Text style={styles.label}>Category</Text>
      <TextInput 
        style={styles.input} 
        placeholder="e.g. Anatomy" 
        value={category} 
        onChangeText={setCategory} 
      />

      <Text style={styles.label}>Reference Image</Text>
      
      {/* Image Preview Area */}
      {image ? (
        <View style={styles.previewContainer}>
          <Image source={{ uri: image }} style={styles.previewImage} />
          <TouchableOpacity style={styles.retakeButton} onPress={() => setImage(null)}>
            <Text style={styles.retakeText}>Change Image</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.selectionContainer}>
          {/* Button A: Gallery */}
          <TouchableOpacity style={styles.selectionButton} onPress={pickImage}>
            <Ionicons name="images-outline" size={32} color="#f4511e" />
            <Text style={styles.selectionText}>Gallery</Text>
          </TouchableOpacity>

          {/* Button B: Camera */}
          <TouchableOpacity style={styles.selectionButton} onPress={takePhoto}>
            <Ionicons name="camera-outline" size={32} color="#f4511e" />
            <Text style={styles.selectionText}>Camera</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={uploading}>
        {uploading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Create Project</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#fff', flexGrow: 1 },
  label: { fontSize: 16, fontWeight: 'bold', marginBottom: 8, marginTop: 10, color: '#333' },
  input: { borderWidth: 1, borderColor: '#ddd', padding: 12, borderRadius: 8, fontSize: 16, backgroundColor: '#f9f9f9' },
  
  selectionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: 20,
  },
  selectionButton: {
    flex: 0.48, 
    height: 120,
    borderWidth: 2,
    borderColor: '#eee',
    borderStyle: 'dashed',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fcfcfc'
  },
  selectionText: { marginTop: 8, color: '#666', fontWeight: '500' },

  previewContainer: { alignItems: 'center', marginBottom: 20 },
  previewImage: { 
    width: '100%', 
    height: 300,            
    borderRadius: 12, 
    resizeMode: 'contain',  
    backgroundColor: '#f0f0f0' 
  },
  retakeButton: { marginTop: 10, padding: 10 },
  retakeText: { color: '#f4511e', fontWeight: 'bold' },

  submitButton: { backgroundColor: '#f4511e', padding: 16, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  btnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});