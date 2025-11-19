import '../styles/globals.css';
import Head from 'next/head';
import { AuthProvider } from '../lib/auth';

function MyApp({ Component, pageProps }) {
  return (
    <AuthProvider>
      <Head>
        <title>AI Phone Assistant</title>
        <meta name="description" content="Premium AI Phone Agent" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </Head>
      <Component {...pageProps} />
    </AuthProvider>
  );
}

export default MyApp;
