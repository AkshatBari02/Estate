import { Card } from "@/components/Cards";
import Filters from "@/components/Filters";
import NoResults from "@/components/NoResults";
import Search from "@/components/Search";
import icons from "@/constants/icons";
import { getProperties, isItemLiked, likeItem, unlikeItem } from "@/lib/appwrite";
import { useGlobalContext } from "@/lib/global-provider";
import { useAppwrite } from "@/lib/useAppwrite";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Image, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Featured() {
  const params = useLocalSearchParams<{query?: string; filter?: string;}>();
  const { user } = useGlobalContext();

  const { data: properties, loading, refetch } = useAppwrite({
    fn: getProperties,
    params: {
      filter: params.filter!,
      query: params.query!,
      limit: 22,
      minRating: 4,
      maxRating: 5,
    },
    skip: true,
  })

  useEffect(()=>{
    refetch({
      filter: params.filter!,
      query: params.query!,
      limit: 22,
      minRating: 4,
      maxRating: 5,
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
          ...(properties || []).map((item) => item.$id),
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
    }, [user, properties]);
  
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

  return (
    <SafeAreaView className="bg-white h-full">
      <FlatList
        data={properties}
        renderItem={({item}) => <Card item={item} onPress={() => handleCardPress(item.$id)}  isLiked={likedItems[item.$id]} onLikeToggle={() => toggleLike(item.$id)}/>}
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
              <TouchableOpacity className="flex flex-row bg-primary-100 rounded-full size-11 items-center justify-center" onPress={() => router.back()}>
                <Image source={icons.backArrow} className="size-5" />
              </TouchableOpacity>
              <Text className="text-base mr-2 text-center font-rubik-medium text-black-300">Our Featured Properties</Text>
              <Image source={icons.bell} className="w-6 h-6" />
            </View>

            <Search />

            <View className="mt-5">
              <Filters />
            </View>
          </View>
        }
      />

    </SafeAreaView>
  );
}
