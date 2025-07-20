import { Image, Text, TouchableOpacity, View } from "react-native";

import icons from "@/constants/icons";
import { Models } from "react-native-appwrite";

interface Props {
  item: Models.Document;
  isLiked?: boolean;
  onLikeToggle?: () => void;
  likeCount?: number;
}

export const Comment = ({ item, isLiked, onLikeToggle, likeCount }: Props) => {
  return (
    <View className="flex flex-col items-start">
      <View className="flex flex-row items-center">
        <Image source={{ uri: item.avatar }} className="size-14 rounded-full" />
        <Text className="text-base text-black-300 text-start font-rubik-bold ml-3">
          {item.name}
        </Text>
      </View>

      <Text className="text-black-200 text-base font-rubik mt-2">
        {item.review}
      </Text>

      <View className="flex flex-row items-center w-full justify-between mt-4">
        <View className="flex flex-row items-center">
          <TouchableOpacity onPress={onLikeToggle}>
          {
            isLiked ? (
              <Image source={icons.heartLiked} className="size-5"/>
            ) : (
              <Image
                source={icons.heart}
                className="size-5"
                tintColor={"#0061FF"}
              />
            )
          }
          </TouchableOpacity>
          <Text className="text-black-300 text-sm font-rubik-medium ml-2">
            {likeCount}
          </Text>
        </View>
        <Text className="text-black-100 text-sm font-rubik">
          {new Date(item.$createdAt).toDateString()}
        </Text>
      </View>
    </View>
  );
};
