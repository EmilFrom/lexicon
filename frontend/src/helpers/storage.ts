import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = '@auth:sessionToken';

export const setToken = (userToken: string) => {
  return AsyncStorage.setItem(TOKEN_KEY, userToken);
};

export const getToken = async () => {
  return await AsyncStorage.getItem(TOKEN_KEY);
};

export const removeToken = async () => {
  return await AsyncStorage.removeItem(TOKEN_KEY);
};
