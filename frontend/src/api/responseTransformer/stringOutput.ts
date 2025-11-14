export const successResponseTransform = (data: { success: string }) => {
  if (!data || !data.success) {
    return 'success';
  }
  return data.success === 'OK' ? 'success' : data.success;
};

export const stringResponseTransform = () => {
  return 'success';
};
