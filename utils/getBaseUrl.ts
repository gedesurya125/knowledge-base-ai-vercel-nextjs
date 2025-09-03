export const getBaseUrl = () => {
  if (process?.env?.NEXT_PUBLIC_HOST_URL)
    return process?.env?.NEXT_PUBLIC_HOST_URL;

  if (process?.env?.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL)
    return `https://${process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL}`;

  if (process?.env?.NEXT_PUBLIC_VERCEL_URL)
    return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;

  return "http://localhost:3000";
};
