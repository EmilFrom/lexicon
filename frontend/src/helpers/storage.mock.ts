let token = '1234567890';

export const setToken = (userToken: string) => {
  return (token = userToken);
};

export const getToken = async () => {
  return token;
};

export const removeToken = async () => {
  return (token = '');
};
