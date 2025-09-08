import { useEffect, useContext } from 'react';
import { useRouter } from 'next/router';
import { AuthContext } from '@/Components/Context/AuthContext';
import { useToast } from '@/Components/Context/ToastContext';
import { useTranslation } from 'react-i18next';
import Layout from '@/Components/Layout/Layout';
import Spinner from '@/Components/Spinner/Spinner';

export default function AuthCallback() {
  const router = useRouter();
  const { login } = useContext(AuthContext);
 
  const { t } = useTranslation();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const { token, user, error } = router.query;

        // Handle authentication errors
        if (error) {
          let errorMessage = t('auth.social_login_error');
          
          if (error === 'google_auth_failed') {
            errorMessage = t('auth.google_login_failed');
          }
          router.replace('/login');
          return;
        }

        // Handle successful authentication
        if (token && user) {
         
          try {
            const userData = JSON.parse(decodeURIComponent(user));
           
            
            // Use the existing login function from AuthContext
            login(userData, token);
            
            
            // Redirect to home page or intended destination
            const redirectTo = sessionStorage.getItem('redirectAfterLogin') || '/';
            sessionStorage.removeItem('redirectAfterLogin');
            router.replace(redirectTo);
            
          } catch (parseError) {
            console.error('Error parsing user data:', parseError);
            
            router.replace('/login');
          }
        } else {
          // No token or user data - redirect to login
          router.replace('/login');
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        
        router.replace('/login');
      }
    };

    // Only process if router is ready and has query params
    if (router.isReady) {
      handleAuthCallback();
    }
  }, []);

  return (
    <Layout title={t('auth.processing_login')}>
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Spinner />
          <p className="mt-4 text-text-secondary">
            {t('auth.processing_login')}...
          </p>
        </div>
      </div>
    </Layout>
  );
}
