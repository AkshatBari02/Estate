import { Comment } from "@/components/Comment";
import { facilities } from "@/constants/data";
import icons from "@/constants/icons";
import images from "@/constants/images";
import { addReview, getPropertyById, getReviewLikes, isItemLiked, likeItem, toggleReviewLike, unlikeItem } from "@/lib/appwrite";
import { useGlobalContext } from "@/lib/global-provider";
import { useAppwrite } from "@/lib/useAppwrite";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { Button, Dimensions, FlatList, Image, KeyboardAvoidingView, Linking, Platform, ScrollView, Share, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from "react-native";
import { Models } from "react-native-appwrite";
import MapView, { Marker } from 'react-native-maps';
import { SafeAreaView } from "react-native-safe-area-context";
import { Toast } from 'toastify-react-native';

const Property = () => {
  const { user } = useGlobalContext();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [showAllReviews, setShowAllReviews] = useState(false);

  const windowHeight = Dimensions.get("window").height;

  const { data: property, refetch } = useAppwrite({
    fn: getPropertyById,
    params: {
      id: id!,
    },
  });

  const [liked, setLiked] = useState(false);

  useEffect(() => {
    const check = async () => {
      if (user?.$id && id) {
        const isLiked = await isItemLiked(user.$id, id);
        setLiked(isLiked);
      }
    };
    check();
  }, [id]);

  const toggleLike = async (type: 'property' | 'review') => {
    if (!user?.$id || !id) return;

    if (liked) {
      await unlikeItem(user.$id, id);
    } else {
      await likeItem(user.$id, id, type);
    }
    setLiked(!liked);
  };

  const [likesMap, setLikesMap] = useState<Record<string, { count: number; isLiked: boolean }>>({});

  useEffect(() => {
    const fetchLikes = async () => {
      if (!user?.$id || property?.review) return;

      const updatedMap: Record<string, { count: number; isLiked: boolean }> = {};

      await Promise.all(
        property?.reviews.map(async (review: { $id: string; }) => {
          const result = await getReviewLikes({
            reviewId: review.$id,
            userId: user.$id,
          });
          updatedMap[review.$id] = {
            count: result.count,
            isLiked: result.isLiked,
          };
        })
      );

      setLikesMap(updatedMap);
    };

    fetchLikes();
  }, [property?.reviews, user]);


  const handleLikeToggle = async (reviewId: string) => {
    const res = await toggleReviewLike({
      reviewId: reviewId,
      userId: user?.$id!,
    });

    if (res) {
      setLikesMap((prev) => {
        const current = prev[reviewId] || { count: 0, isLiked: false };
        return {
          ...prev,
          [reviewId]: {
            isLiked: res.liked,
            count: current.count + (res.liked ? 1 : -1),
          },
        };
      });
    }
  }

  const [modalImage, setModalImage] = useState<string | null>(null);

  const onShare = async () => {
    try {
      const result = await Share.share({
        title: property?.name,
        message: `Check out this property: ${property?.name} located at ${property?.address}. \n\nPrice: ₹${property?.price} \n\nView more on our app!\n\n${property?.image}`,
        url: property?.image,
      });

      if (result.action === Share.sharedAction) {
        if (result.activityType) {
          console.log("Shared with activity type:", result.activityType);
        } else {
          console.log("Item shared");
        }
      } else if (result.action === Share.dismissedAction) {
        console.log("Share dismissed");
      }
    } catch (error: any) {
      console.error("Error sharing item:", error.message);
    }
  };

  const [review, setReview] = useState("");

  const handleAddReview = async () => {
    if (!review.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Empty Review',
        text2: 'Please write something to add as review !',
        position: 'bottom',
        visibilityTime: 4000,
        autoHide: true,
        theme:'dark',
      })
      return;
    }

    try {
      await addReview({
        review,
        name: user?.name!,
        avatar: user?.avatar!,
        property: id!,
        rating: 5.0,
      });

      Toast.show({
        type: 'error',
        text1: 'Review Added',
        text2: 'Your review has been added !',
        position: 'top',
        visibilityTime: 4000,
        autoHide: true,
        theme:'dark',
      })
      setReview("");
      await refetch({id:id!});
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Review Error',
        text2: `Failed to add review: ${err}`,
        position: 'bottom',
        visibilityTime: 4000,
        autoHide: true,
        theme:'dark',
      })
    }
  };

  const handleBookNow = () => {
    Toast.show({
      type: 'success',
      text1: 'Property booked',
      text2: 'Your property has been booked !',
      position: 'bottom',
      visibilityTime: 4000,
      autoHide: true,
      theme:'dark',
    })
  }

  return (
    <SafeAreaView  className="bg-white h-full">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="pb-32 bg-white"
        keyboardShouldPersistTaps="handled"
      >
        <View className="relative w-full" style={{ height: windowHeight / 2 }}>
          <Image
            source={{ uri: property?.image }}
            className="size-full"
            resizeMode="cover"
          />
          <Image
            source={images.whiteGradient}
            className="absolute top-0 w-full z-40"
          />

          <View
            className="z-50 absolute inset-x-7"
            style={{
              top: Platform.OS === "ios" ? 70 : 20,
            }}
          >
            <View className="flex flex-row items-center w-full justify-between">
              <TouchableOpacity
                onPress={() => router.back()}
                className="flex flex-row bg-white rounded-full size-11 items-center justify-center"
              >
                <Image source={icons.backArrow} className="size-5" />
              </TouchableOpacity>

              <View className="flex flex-row items-center gap-3">
                <TouchableOpacity onPress={() => toggleLike('property')}>
                  {
                    liked ? (
                        <Image
                            source={icons.heartLiked}
                            className="size-7"
                        />
                    ) : (
                        <Image
                            source={icons.heart}
                            className="size-7"
                            tintColor={"#191D31"}
                        />
                    )
                }
                </TouchableOpacity>
                <TouchableOpacity onPress={onShare}>
                  <Image source={icons.send} className="size-7" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        <View className="px-5 mt-7 flex gap-2">
          <Text className="text-2xl font-rubik-extrabold">
            {property?.name}
          </Text>

          <View className="flex flex-row items-center gap-3">
            <View className="flex flex-row items-center px-4 py-2 bg-primary-100 rounded-full">
              <Text className="text-xs font-rubik-bold text-primary-300">
                {property?.type}
              </Text>
            </View>

            <View className="flex flex-row items-center gap-2">
              <Image source={icons.star} className="size-5" />
              <Text className="text-black-200 text-sm mt-1 font-rubik-medium">
                {property?.rating} ({property?.reviews.length} reviews)
              </Text>
            </View>
          </View>

          <View className="flex flex-row items-center mt-5">
            <View className="flex flex-row items-center justify-center bg-primary-100 rounded-full size-10">
              <Image source={icons.bed} className="size-4" />
            </View>
            <Text className="text-black-300 text-sm font-rubik-medium ml-2">
              {property?.bedrooms} Beds
            </Text>
            <View className="flex flex-row items-center justify-center bg-primary-100 rounded-full size-10 ml-7">
              <Image source={icons.bath} className="size-4" />
            </View>
            <Text className="text-black-300 text-sm font-rubik-medium ml-2">
              {property?.bathrooms} Baths
            </Text>
            <View className="flex flex-row items-center justify-center bg-primary-100 rounded-full size-10 ml-7">
              <Image source={icons.area} className="size-4" />
            </View>
            <Text className="text-black-300 text-sm font-rubik-medium ml-2">
              {property?.area} sqft
            </Text>
          </View>

          <View className="w-full border-t border-primary-200 pt-7 mt-5">
            <Text className="text-black-300 text-xl font-rubik-bold">
              Agent
            </Text>

            <View className="flex flex-row items-center justify-between mt-4">
              <View className="flex flex-row items-center">
                <Image
                  source={{ uri: property?.agent.avatar }}
                  className="size-14 rounded-full"
                />

                <View className="flex flex-col items-start justify-center ml-3">
                  <Text className="text-lg text-black-300 text-start font-rubik-bold">
                    {property?.agent.name}
                  </Text>
                  <Text className="text-sm text-black-200 text-start font-rubik-medium">
                    {property?.agent.email}
                  </Text>
                </View>
              </View>

              <View className="flex flex-row items-center gap-3">
                <TouchableOpacity
                  onPress={async () => {
                    const phoneNumber = property?.agent.mobile;
                    if (!phoneNumber || phoneNumber === '') {
                      Toast.show({
                        type: 'info',
                        text1: 'Phone Number Unavailable !',
                        text2: "Agent's phone number is not available right now !",
                        position: 'bottom',
                        visibilityTime: 4000,
                        autoHide: true,
                        theme:'dark',
                      });
                      return;
                    }

                    const supported = await Linking.canOpenURL(`sms:${phoneNumber}`);
                    if (supported) {
                      Linking.openURL(`sms:${phoneNumber}?body=Hello, I'm interested in your property - ${property?.name}`);
                    } else {
                      Toast.show({
                        type: 'error',
                        text1: 'Support Error',
                        text2: 'SMS is not supported on your device !',
                        position: 'bottom',
                        visibilityTime: 4000,
                        autoHide: true,
                        theme:'dark',
                      });
                    }
                  }}
                >
                  <Image source={icons.chat} className="size-7" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={async () => {
                    const phoneNumber = property?.agent.mobile;
                    if (!phoneNumber || phoneNumber === '') {
                      Toast.show({
                        type: 'info',
                        text1: 'Phone Number Unavailable !',
                        text2: "Agent's phone number is not available right now !",
                        position: 'bottom',
                        visibilityTime: 4000,
                        autoHide: true,
                        theme:'dark',
                      });
                      return;
                    }

                    const supported = await Linking.canOpenURL(`tel:${phoneNumber}`);
                    if (supported) {
                      Linking.openURL(`tel:${phoneNumber}`);
                    } else {
                      Toast.show({
                        type: 'error',
                        text1: 'Support Error',
                        text2: 'Phone is not supported on your device !',
                        position: 'bottom',
                        visibilityTime: 4000,
                        autoHide: true,
                        theme:'dark',
                      });
                    }
                  }}
                >
                  <Image source={icons.phone} className="size-7" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View className="mt-7">
            <Text className="text-black-300 text-xl font-rubik-bold">
              Overview
            </Text>
            <Text className="text-black-200 text-base font-rubik mt-2">
              {property?.description}
            </Text>
          </View>

          <View className="mt-7">
            <Text className="text-black-300 text-xl font-rubik-bold">
              Facilities
            </Text>

            {property?.facilities.length > 0 && (
              <View className="flex flex-row flex-wrap items-start justify-start mt-2 gap-5">
                {property?.facilities.map((item: string, index: number) => {
                  const facility = facilities.find(
                    (facility) => facility.title === item
                  );

                  return (
                    <View
                      key={index}
                      className="flex flex-1 flex-col items-center min-w-16 max-w-20"
                    >
                      <View className="size-14 bg-primary-100 rounded-full flex items-center justify-center">
                        <Image
                          source={facility ? facility.icon : icons.info}
                          className="size-6"
                        />
                      </View>

                      <Text
                        numberOfLines={1}
                        ellipsizeMode="tail"
                        className="text-black-300 text-sm text-center font-rubik mt-1.5"
                      >
                        {item}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {property?.gallery.length > 0 && (
            <View className="mt-7">
              <Text className="text-black-300 text-xl font-rubik-bold">
                Gallery
              </Text>
              <FlatList
                contentContainerStyle={{ paddingRight: 20 }}
                data={property?.gallery}
                keyExtractor={(item) => item.$id}
                horizontal
                showsHorizontalScrollIndicator={false}
                renderItem={({ item }) => (
                  <TouchableOpacity onPress={() => setModalImage(item.image)}>
                    <Image
                      source={{ uri: item.image }}
                      className="size-40 rounded-xl"
                    />
                  </TouchableOpacity>
                )}
                contentContainerClassName="flex gap-4 mt-3"
              />
            </View>
          )}

          {modalImage && (
            <View className="absolute inset-0 z-50 bg-black/70 items-center justify-center">
              <TouchableWithoutFeedback
                className="absolute inset-0"
                onPress={() => setModalImage(null)}
              >
              <Image
                source={{ uri: modalImage }}
                className="w-[90%] h-[70%] rounded-xl z-60"
                resizeMode="contain"
              />
              </TouchableWithoutFeedback>
            </View>
          )}

          <View className="mt-7">
            <Text className="text-black-300 text-xl font-rubik-bold">
              Location
            </Text>
            <View className="flex flex-row items-center justify-start mt-4 gap-2">
              <Image source={icons.location} className="w-7 h-7" />
              <Text className="text-black-200 text-sm font-rubik-medium">
                {property?.address}
              </Text>
            </View>

            {property?.geolocation && (
              <TouchableOpacity
                activeOpacity={1}
                onPress={() => {
                  const [lat, lng] = property.geolocation.split(',').map(Number);
                  const url = Platform.select({
                    ios: `http://maps.apple.com/?ll=${lat},${lng}`,
                    android: `geo:${lat},${lng}?q=${lat},${lng}`,
                  });
                  Linking.openURL(url!);
                }}
                className="h-52 w-full mt-5 rounded-xl overflow-hidden"
              >
                <MapView
                  style={{ height: 208, width: '100%' }}
                  initialRegion={{
                    latitude: parseFloat(property.geolocation.split(',')[0]),
                    longitude: parseFloat(property.geolocation.split(',')[1]),
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  }}
                  pointerEvents="none"
                >
                  <Marker
                    coordinate={{
                      latitude: parseFloat(property.geolocation.split(',')[0]),
                      longitude: parseFloat(property.geolocation.split(',')[1]),
                    }}
                    title={property.name}
                    description={property.address}
                  />
                </MapView>
              </TouchableOpacity>
            )}

          </View>

          {property?.reviews.length > 0 && (
            <View className="mt-7">
              <View className="flex flex-row items-center justify-between">
                <View className="flex flex-row items-center">
                  <Image source={icons.star} className="size-6" />
                  <Text className="text-black-300 text-xl font-rubik-bold ml-2">
                    {property?.rating} ({property?.reviews.length} reviews)
                  </Text>
                </View>

                <TouchableOpacity onPress={() => setShowAllReviews(prev => !prev)}>
                  <Text className="text-primary-300 text-base font-rubik-bold">
                    {showAllReviews ? 'View Less' : 'View All'}
                  </Text>
                </TouchableOpacity>
              </View>

                {
                  showAllReviews ? (
                    property?.reviews.map((review: Models.Document, index: React.Key | null | undefined) => (
                      <View key={index} className="mt-5">
                        <Comment key={index} item={review} isLiked={likesMap[review.$id]?.isLiked}
  onLikeToggle={() => handleLikeToggle(review.$id)} likeCount={likesMap[review.$id]?.count ?? 0}/>
                      </View>
                    ))
                  ) : (
                    <View className="mt-5">
                      <Comment item={property?.reviews[0]}  isLiked={likesMap[property?.reviews[0].$id]?.isLiked}
  onLikeToggle={() => handleLikeToggle(property?.reviews[0].$id)} likeCount={likesMap[property?.reviews[0].$id]?.count ?? 0}/>
                    </View>
                  )
                }
            </View>
          )}
        </View>

        <TouchableOpacity activeOpacity={1} className="px-5">
          <View className="mt-5 bg-white rounded-lg p-3 border">
            <TextInput
              value={review}
              onChangeText={setReview}
              multiline
              numberOfLines={6}
              placeholder={"✒ Add you review"}
              textAlignVertical="top"
              className="text-base font-rubik w-full"
              style={{ minHeight: 120 }}
            />
            <Button title="Add" color={'#0061FF'} onPress={handleAddReview}/>
          </View>
        </TouchableOpacity>
      </ScrollView>
      </KeyboardAvoidingView>

      <View className="absolute bg-white bottom-0 w-full rounded-t-2xl border-t border-r border-l border-primary-200 p-7">
        <View className="flex flex-row items-center justify-between gap-10">
          <View className="flex flex-col items-start">
            <Text className="text-black-200 text-xs font-rubik-medium">
              Price
            </Text>
            <Text
              numberOfLines={1}
              className="text-primary-300 text-start text-2xl font-rubik-bold"
            >
              ₹{property?.price} K
            </Text>
          </View>

          <TouchableOpacity className="flex-1 flex flex-row items-center justify-center bg-primary-300 py-3 rounded-full shadow-md shadow-zinc-400" onPress={handleBookNow}>
            <Text className="text-white text-lg text-center font-rubik-bold">
              Book Now
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default Property;
