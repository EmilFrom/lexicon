export const changePasswordOutputResponseTransformer = (data: {
  success: string;
}) => {
  if (!data || !data.success) {
    throw new Error(`No account found`);
  }
  return 'success';
};
