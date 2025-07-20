import * as FileSystem from 'expo-file-system';
import * as Linking from 'expo-linking';
import { openAuthSessionAsync } from "expo-web-browser";
import { Account, Avatars, Client, Databases, ID, OAuthProvider, Permission, Query, Role, Storage } from "react-native-appwrite";

export const config = {
    platform: 'com.akshat.estate',
    endpoint: process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT,
    projectId: process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID,
    databaseId: process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID,
    galleriesCollectionId: process.env.EXPO_PUBLIC_APPWRITE_GALLERIES_COLLECTION_ID,
    reviewsCollectionId: process.env.EXPO_PUBLIC_APPWRITE_REVIEWS_COLLECTION_ID,
    agentsCollectionId: process.env.EXPO_PUBLIC_APPWRITE_AGENTS_COLLECTION_ID,
    propertiesCollectionId: process.env.EXPO_PUBLIC_APPWRITE_PROPERTIES_COLLECTION_ID,
    likesCollectionId: process.env.EXPO_PUBLIC_APPWRITE_LIKES_COLLECTION_ID,
    storageBucketId: process.env.EXPO_PUBLIC_APPWRITE_STORAGE_BUCKET_ID,
}

export const client = new Client();

client
.setEndpoint(config.endpoint!)
.setProject(config.projectId!)
.setPlatform(config.platform!)

export const avatar = new Avatars(client);
export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);

export async function login() {
    try {
        const redirectUri = Linking.createURL('/'); 
        const response = await account.createOAuth2Token(OAuthProvider.Google, redirectUri, redirectUri);

        if (!response) {
            throw new Error('Failed to login');
        }

        const browserResult = await openAuthSessionAsync(response.toString(), redirectUri);

        if (browserResult.type !== 'success') {
            throw new Error('OAuth2 session was not successful');
        }

        const url = new URL(browserResult.url);

        const secret = url.searchParams.get('secret')?.toString();
        const userId = url.searchParams.get('userId')?.toString();

        if (!secret || !userId) {
          throw new Error('Missing secret or userId from redirect URL');
        }

        const session = await account.createSession(userId, secret);

        if (!session) throw new Error('Failed to create Appwrite session');

        return true;

    } catch (error) {
        console.error(error);
        return false;
    }
}


export async function logout() {
    try {
        await account.deleteSession('current');
        return true;
    } catch (error) {
        console.error(error);
        return false;
    }
}


export async function getCurrentUser() {
    try {
        const response = await account.get();
        if(response.$id) {
            const googleAvatar = response.prefs?.picture;
            const initials = response.name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")
                                    .toUpperCase();

            const fallbackAvatar = `https://api.dicebear.com/7.x/initials/png?seed=${initials}`;
            const avatarUrl = googleAvatar || fallbackAvatar;
            return {
                ...response,
                avatar: avatarUrl
            }
        }
    } catch (error) {
        console.error(error);
        return null;
    }
}

export async function getLatestProperties() {
    try {
        const result = await databases.listDocuments(
            config.databaseId!,
            config.propertiesCollectionId!,
            [Query.orderAsc('$createdAt'), Query.limit(5)]
        )
        return result.documents;
    } catch (error) {
        console.error(error);
        return [];
    }
}

export async function getProperties({ filter, query, limit, minRating, maxRating} : {
    filter: string;
    query: string;
    limit?: number
    minRating?: number;
    maxRating?: number;
}) {
    try {
        const buildQuery = [Query.orderDesc('$createdAt')];
        if (filter && filter !== 'All') {
            buildQuery.push(Query.equal('type', filter));
        }
        if (query) {
            buildQuery.push(
                Query.or([
                    Query.search('name',query),
                    Query.search('address',query),
                    Query.search('type',query),
                ])
            )
        }
        if (minRating !== undefined) {
          buildQuery.push(Query.greaterThanEqual('rating', minRating));
        }

        if (maxRating !== undefined) {
          buildQuery.push(Query.lessThanEqual('rating', maxRating));
        }
        if (limit) {
            buildQuery.push(Query.limit(limit));
        }
        const result = await databases.listDocuments(
            config.databaseId!,
            config.propertiesCollectionId!,
            buildQuery,
        )
        return result.documents;
    } catch (error) {
        console.error(error);
        return [];
    }
}

export async function getPropertyById({ id }: { id: string }) {
  try {
    const result = await databases.getDocument(
      config.databaseId!,
      config.propertiesCollectionId!,
      id
    );
    return result;
  } catch (error) {
    console.error(error);
    return null;
  }
}

export const addReview = async ({
  review,
  name,
  avatar,
  property,
  rating
}: {
  review: string;
  name: string;
  avatar: string;
  property: string;
  rating: number;
}) => {
  try {
    const res = await databases.createDocument(
      config.databaseId!,
      config.reviewsCollectionId!,
      ID.unique(),
      {
        review,
        name,
        avatar,
        property,
        rating,
      }
    );
    return res;
  } catch (err) {
    console.error("Error creating review:", err);
    throw err;
  }
};

// Save Like
export async function likeItem(userId: string, targetId: string, targetType: 'property' | 'review') {
  try {
    await databases.createDocument(
      config.databaseId!,
      config.likesCollectionId!, // replace with your actual ID
      ID.unique(),
      {
        userId,
        targetId,
        targetType,
      }
    );
    return true;
  } catch (error) {
    console.error('Error liking item:', error);
    return false;
  }
}

// Remove Like
export async function unlikeItem(userId: string, targetId: string) {
  try {
    const res = await databases.listDocuments(
      config.databaseId!,
      config.likesCollectionId!,
      [
        Query.equal('userId', userId),
        Query.equal('targetId', targetId),
      ]
    );
    const doc = res.documents[0];
    if (doc) {
      await databases.deleteDocument(config.databaseId!, config.likesCollectionId!, doc.$id);
    }
    return true;
  } catch (error) {
    console.error('Error unliking item:', error);
    return false;
  }
}

// Check if Liked
export async function isItemLiked(userId: string, targetId: string) {
  try {
    const res = await databases.listDocuments(
      config.databaseId!,
      config.likesCollectionId!,
      [
        Query.equal('userId', userId),
        Query.equal('targetId', targetId),
      ]
    );
    return res.documents.length > 0;
  } catch {
    return false;
  }
}

export const toggleReviewLike = async ({
  reviewId,
  userId,
}: {
  reviewId: string;
  userId: string;
}) => {
  try {
    const existing = await databases.listDocuments(
      config.databaseId!,
      config.likesCollectionId!,
      [
        Query.equal("targetType", "review"),
        Query.equal("userId", userId),
        Query.equal("targetId", reviewId),
      ]
    );

    if (existing.documents.length > 0) {
      // User already liked — so unlike
      await databases.deleteDocument(
        config.databaseId!,
        config.likesCollectionId!,
        existing.documents[0].$id
      );
      return { liked: false };
    } else {
      // Like the review
      await databases.createDocument(
        config.databaseId!,
        config.likesCollectionId!,
        ID.unique(),
        {
          userId,
          targetId: reviewId,
          targetType: "review",
        }
      );
      return { liked: true };
    }
  } catch (error) {
    console.error("Error toggling like", error);
    return null;
  }
};

export const getReviewLikes = async ({
  reviewId,
  userId,
}: {
  reviewId: string;
  userId: string;
}) => {
  try {
    const [allLikes, myLike] = await Promise.all([
      databases.listDocuments(
        config.databaseId!,
        config.likesCollectionId!,
        [Query.equal("targetType", "review"), Query.equal("targetId", reviewId)]
      ),
      databases.listDocuments(
        config.databaseId!,
        config.likesCollectionId!,
        [
          Query.equal("targetType", "review"),
          Query.equal("targetId", reviewId),
          Query.equal("userId", userId),
        ]
      ),
    ]);

    return {
      count: allLikes.total,
      isLiked: myLike.documents.length > 0,
    };
  } catch (err) {
    console.error("Failed to get review likes", err);
    return { count: 0, isLiked: false };
  }
};

export interface PropertyForm {
  name: string;
  description: string;
  address: string;
  geolocation: string;
  price: string;
  area: string;
  bedrooms: string;
  bathrooms: string;
  facilities: string;
  rating: string;
  type: string;
  images: {
    uri: string;
  }[];
}

export async function addPropertyWithImages(form: PropertyForm) {
  const {
    name,
    description,
    address,
    geolocation,
    price,
    area,
    bedrooms,
    bathrooms,
    facilities,
    type,
    rating,
    images,
  } = form;

  const currentUser = await getCurrentUser();

  if (!currentUser) {
    throw new Error("User not logged in");
  }

  const existingAgents = await databases.listDocuments(
    config.databaseId!,
    config.agentsCollectionId!,
    [Query.equal("email", currentUser.email)]
  );

  let agentId = "";

  if (existingAgents.documents.length > 0) {
    agentId = existingAgents.documents[0].$id;
  } else {
    try {
      const agent = await databases.createDocument(
        config.databaseId!,
        config.agentsCollectionId!,
        ID.unique(),
        {
          name: currentUser.name,
          email: currentUser.email,
          avatar: currentUser.avatar,
          mobile: currentUser.phone,
        },
        [Permission.read(Role.any())]
      );

      agentId = agent.$id;
    } catch (error) {
      console.error("Failed to create agent:", error);
    }

  const uploadedImageURLs: string[] = [];

  for (const img of images) {
    const fileName = img.uri.split('/').pop() || `image-${Date.now()}.jpg`;
    const fileInfo = await FileSystem.getInfoAsync(img.uri);

    if (!fileInfo.exists) throw new Error("File not found");

    const file = {
      name: fileName,
      type: 'image/jpeg',
      size: fileInfo.size ?? 0,
      uri: img.uri,
    };

    const uploaded = await storage.createFile(
      config.storageBucketId!,
      ID.unique(),
      file,
      [Permission.read(Role.any())]
    );
    const url = `${client.config.endpoint}/storage/buckets/${config.storageBucketId}/files/${uploaded.$id}/view?project=${client.config.project}`;
    uploadedImageURLs.push(url);
  }

  const mainImageUrl = uploadedImageURLs[0];
  const galleryImageUrls = uploadedImageURLs.slice(1);

  const galleryDocIds: string[] = [];

  for (const url of galleryImageUrls) {
    const galleryDoc = await databases.createDocument(
      config.databaseId!,
      config.galleriesCollectionId!,
      ID.unique(),
      {
        image: url,
      },
      [Permission.read(Role.any())]
    );

    galleryDocIds.push(galleryDoc.$id);
  }

  const document = await databases.createDocument(
    config.databaseId!,
    config.propertiesCollectionId!,
    ID.unique(),
    {
      name,
      description,
      address,
      price: Number(price),
      area: Number(area),
      bedrooms: Number(bedrooms),
      bathrooms: Number(bathrooms),
      facilities: facilities.split(',').map((f) => f.trim()),
      rating: Number(rating),
      type,
      geolocation: geolocation,
      image: mainImageUrl,
      gallery: galleryDocIds,
      agent: agentId,
    },
    [Permission.read(Role.any())]
  );

  return document;
}
}
