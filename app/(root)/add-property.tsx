import icon from "@/assets/images/icon.png";
import icons from "@/constants/icons";
import { addPropertyWithImages } from "@/lib/appwrite";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useState } from "react";
import { Image, KeyboardAvoidingView, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import RNPickerSelect from "react-native-picker-select";
import { SafeAreaView } from "react-native-safe-area-context";
import { Toast } from "toastify-react-native";

const FACILITY_OPTIONS = [
  { label: "WiFi", value: "WiFi" },
  { label: "Parking", value: "Parking" },
  { label: "Swimming Pool", value: "Swimming-Pool" },
  { label: "Gym", value: "Gym" },
  { label: "Laundry", value: "Laundry" },
  { label: "Pet Friendly", value: "Pet-Friendly" },
  { label: "Sports Center", value: "Sports-Center" },
];

const TYPE_OPTIONS = [
  { label: "Villa", value: "Villa" },
  { label: "Condo", value: "Condo" },
  { label: "Studio", value: "Studio" },
  { label: "Appartment", value: "Apartnment" },
  { label: "House", value: "House" },
  { label: "Townhouse", value: "Townhouse" },
  { label: "Duplex", value: "Duplex" },
  { label: "Other", value: "Other" },
];

export default function AddPropertyScreen() {
  const [form, setForm] = useState({
    name: "",
    description: "",
    address: "",
    geolocation: "",
    price: "",
    area: "",
    bedrooms: "",
    bathrooms: "",
    facilities: "",
    type: "",
    rating: ""
  });

  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [isTypeFocused, setIsTypeFocused] = useState(false);
  const [isFacilitiesFocused, setIsFacilitiesFocused] = useState(false);

  const handleSubmit = async () => {
    const { name, description, address, geolocation, price, type, rating } = form;

    if (!name || !description || !address || !geolocation || !price || !type || !rating) {
      Toast.show({
        type: 'error',
        text1: 'Validation Failed',
        text2: 'Please fill all required fields !',
        position: 'top',
        visibilityTime: 4000,
        autoHide: true,
        theme:'dark',
    })
      return;
    }

    try {
      setUploading(true);

      const property = await addPropertyWithImages({
        ...form,
        images: images.map((uri) => ({ uri })),
      });

      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Property Added Successfully !',
        position: 'top',
        visibilityTime: 4000,
        autoHide: true,
        theme:'dark',
      })
      setForm({
        name: "",
        description: "",
        address: "",
        geolocation: "",
        price: "",
        area: "",
        bedrooms: "",
        bathrooms: "",
        facilities: "",
        type: "",
        rating: "",
      });
      setImages([]);
      router.push(`/properties/${property}`)
    } catch (err) {
      console.error(err);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to add property !',
        position: 'top',
        visibilityTime: 4000,
        autoHide: true,
        theme:'dark',
    })
    } finally {
      setUploading(false);
    }
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      const selected = result.assets.map((asset) => asset.uri);
      setImages((prev) => [...prev, ...selected]);
    }
  };

  return (
    <SafeAreaView >
      <KeyboardAvoidingView>
      <ScrollView className="bg-white h-full px-5 mb-3">
        <View className="flex flex-row items-center justify-between py-5">
            <TouchableOpacity className="flex flex-row bg-primary-100 rounded-full size-11 items-center justify-center" onPress={() => router.back()}>
                <Image source={icons.backArrow} className="size-5" />
            </TouchableOpacity>
            <Text className="text-base mr-2 text-center font-rubik-medium text-black-300">Add Your Property</Text>
            <Text>{'     '}</Text>
        </View>
        <View className="items-center p-5 h-48">
            <Image source={icon} className="w-full h-full" resizeMode="contain"/>
            <Text className="text-center font-rubik-extrabold">Estate</Text>
        </View>
        <View className="py-5">
            <Text className="font-rubik-bold text-lg">Add Property Details:</Text>
        </View>

        {Object.keys(form).map((key) => {
          if (key === "type" || key === "facilities") return null;

          return (
            <View key={key} className="py-2">
                <Text className="text-lg font-rubik py-1">{key.charAt(0).toUpperCase() + key.slice(1)}:</Text>
                <TextInput
                  key={key}
                  onFocus={() => setFocusedField(key)}
                  onBlur={() => setFocusedField(null)}
                  placeholderTextColor="#d1d5db"
                  placeholder={key === 'geolocation' ? 'Geo Location: Latitude,Longitude' : key.charAt(0).toUpperCase() + key.slice(1)}
                  className={`border-hairline p-2 mb-3 rounded-lg h-16 font-rubik ${focusedField === key ? 'border-primary-300' : 'border-gray-300'}`}
                  keyboardType={
                      ["price", "area", "bedrooms", "bathrooms", "rating"].includes(key)
                      ? "numeric"
                      : "default"
                  }
                  value={(form as any)[key]}
                  onChangeText={(val) => setForm((prev) => ({ ...prev, [key]: val }))}
                />
            </View>
          );
        })}

        {/* Dropdown for Type */}
        <View className=" py-1">
        <Text className="text-lg font-rubik py-1">Property Type:</Text>
        <View className={`border-hairline rounded-lg mb-3  ${isTypeFocused ? "border-primary-300" : "border-gray-300"}`}>
            <RNPickerSelect
                onValueChange={(val) => setForm((prev) => ({ ...prev, type: val }))}
                value={form.type}
                items={TYPE_OPTIONS}
                placeholder={{ label: "Select property type", value: null }}
                onOpen={() => setIsTypeFocused(true)}
                onClose={() => setIsTypeFocused(false)}
            />
        </View>

        {/* Dropdown for Facilities */}
        <View className="my-3">
            <Text className="text-lg font-rubik py-1">Facilities:</Text>
            <View className={`border-hairline rounded-lg ${isFacilitiesFocused ? "border-primary-300" : "border-gray-300"}`}>
                <RNPickerSelect
                    onValueChange={(val) => {
                        const prev = form.facilities.split(",").filter((f) => f);
                        if (!prev.includes(val)) {
                        setForm((prevForm) => ({
                            ...prevForm,
                            facilities: [...prev, val].join(","),
                        }));
                        }
                    }}
                    items={FACILITY_OPTIONS}
                    placeholder={{ label: "Add a facility", value: null }}
                    onOpen={() => setIsFacilitiesFocused(true)}
                    onClose={() => setIsFacilitiesFocused(false)}
                />
            </View>
            {form.facilities ? (
            <Text className="text-sm mt-1 text-gray-600">Selected: {form.facilities}</Text>
            ) : null}
        </View>
        
        </View>

        {/* Image Picker */}
        <TouchableOpacity
          onPress={handlePickImage}
          className="py-3 rounded mb-4 mt-5 border flex-row flex items-center justify-center"
        >
          <Image source={icons.image} className="size-5 mr-2"/>
          <Text className="text-center">Select Images</Text>
        </TouchableOpacity>

        <ScrollView horizontal className="mb-4">
          {images.map((img, index) => (
            <Image
              key={index}
              source={{ uri: img }}
              className="w-20 h-20 rounded mr-2"
            />
          ))}
        </ScrollView>

        <View className="flex flex-row gap-4 mb-12">
            <TouchableOpacity
            onPress={() => router.back()}
            className="border py-3 rounded flex-1 border-danger"
            disabled={uploading}
            >
                <Text className="text-center text-danger">
                    Cancel
                </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
            onPress={handleSubmit}
            className="bg-blue-600 py-3 rounded flex-1"
            disabled={uploading}
            >
                <Text className="text-white text-center">
                    {uploading ? "Uploading..." : "Add Property"}
                </Text>
            </TouchableOpacity>
        </View>

      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
