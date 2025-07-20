import { Card, FeaturedCard } from "@/components/Cards";
import Filters from "@/components/Filters";
import NoResults from "@/components/NoResults";
import Search from "@/components/Search";
import icons from "@/constants/icons";
import { getLatestProperties, getProperties, isItemLiked, likeItem, unlikeItem } from "@/lib/appwrite";
import { useGlobalContext } from "@/lib/global-provider";
import { useAppwrite } from "@/lib/useAppwrite";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Image, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HomeScreen() {
  const { user } = useGlobalContext();
  const params = useLocalSearchParams<{query?: string; filter?: string;}>();
  const { data: latestProperties, loading: latestPropertiesLoading,} = useAppwrite({
    fn: getLatestProperties,
  });

  const { data: properties, loading, refetch } = useAppwrite({
    fn: getProperties,
    params: {
      filter: params.filter!,
      query: params.query!,
      limit: 10,
    },
    skip: true,
  })

  useEffect(()=>{
    refetch({
      filter: params.filter!,
      query: params.query!,
      limit: 10,
    })
  },[params.filter,params.query])

  const handleCardPress = (id: string) => {
    router.push(`/properties/${id}`);
  }

  const [likedItems, setLikedItems] = useState<Record<string, boolean>>({});
  useEffect(() => {
    const checkLikes = async () => {
      if (!user?.$id) return;

      const allIds = [
        ...(properties || []).map((item) => item.$id),
        ...(latestProperties || []).map((item) => item.$id),
      ];

      const likeChecks = allIds.map((id) =>
        isItemLiked(user.$id, id).then((liked) => ({ id, liked }))
      );

      const results = await Promise.all(likeChecks);

      const likeMap: Record<string, boolean> = {};
      results.forEach(({ id, liked }) => {
        likeMap[id] = liked;
      });

      setLikedItems(likeMap);
    };

    checkLikes();
  }, [user, properties, latestProperties]);

  const toggleLike = async (itemId: string) => {
    if (!user?.$id) return;

    const currentlyLiked = likedItems[itemId];

    if (currentlyLiked) {
      await unlikeItem(user.$id, itemId);
    } else {
      await likeItem(user.$id, itemId, 'property');
    }

    setLikedItems((prev) => ({
      ...prev,
      [itemId]: !currentlyLiked,
    }));
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  return (
    <SafeAreaView className="bg-white h-full">
      <FlatList
        data={properties}
        renderItem={({item}) => <Card item={item} onPress={() => handleCardPress(item.$id)} isLiked={likedItems[item.$id]} onLikeToggle={() => toggleLike(item.$id)}/>}
        keyExtractor={(item) => item.$id}
        numColumns={2}
        contentContainerClassName="pb-32"
        columnWrapperClassName="flex gap-5 px-5"
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator size='large' className="text-primary-300 mt-5" />
          ) : <NoResults/>
        }
        ListHeaderComponent={
          <View className="px-5">
            <View className="flex flex-row items-center justify-between mt-5">
              <View className="flex flex-row items-center">
                <Image source={{uri: user?.avatar}} className="size-12 rounded-full" />
                <View className="flex flex-col items-start ml-2 justify-center">
                  <Text className="text-xs font-rubik text-black-100">{getGreeting()}</Text>
                  <Text className="text-base font-rubik-medium text-black-300">{user?.name}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => router.push('/add-property')}>
                <Image source={icons.add} className="size-8" />
              </TouchableOpacity>
            </View>
          
            <Search />

            <View className="my-5">
              <View className="flex flex-row items-center justify-between">
                <Text className="text-xl font-rubik-bold text-black-300">Featured</Text>
                <TouchableOpacity onPress={() => router.push('/featured')}>
                  <Text className="text-base font-rubik-bold text-primary-300">See All</Text>
                </TouchableOpacity>
              </View>

              {latestPropertiesLoading ? (
                <ActivityIndicator size='large' className="text-primary-300 mt-2" />
                ) : ((!latestProperties || latestProperties.length === 0) 
                  ? (
                      <NoResults />
                    ) : (
                          <FlatList
                            data={latestProperties}
                            renderItem={({item}) => <FeaturedCard item={item} onPress={() => handleCardPress(item.$id)}  isLiked={likedItems[item.$id]} onLikeToggle={() => toggleLike(item.$id)}/>}
                            keyExtractor={(item) => item.$id}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            bounces={false}
                            contentContainerClassName="flex gap-5 mt-5"
                          />
                        )
                    )
              }
            </View>

            <View className="flex flex-row items-center justify-between">
              <Text className="text-xl font-rubik-bold text-black-300">Our Recommedation</Text>
              <TouchableOpacity onPress={() => router.push('/recommendations')}>
                <Text className="text-base font-rubik-bold text-primary-300">See All</Text>
              </TouchableOpacity>
            </View>

            <Filters />

          </View>
        }
      />

    </SafeAreaView>
  );
}
