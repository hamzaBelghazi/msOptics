import {
  createContext,
  useState,
  useEffect,
  useCallback,
  useContext,
} from "react";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import { jwtDecode } from "jwt-decode";
import axios from "axios";
import CryptoJS from "crypto-js";

// Encryption key - in production, this should be in environment variables
const ENCRYPTION_KEY =
  process.env.NEXT_PUBLIC_ENCRYPTION_KEY ||
  "this-is-my-old--and-week-secret-code-for-token";

// Function to encrypt data
const encryptData = (data) => {
  return CryptoJS.AES.encrypt(JSON.stringify(data), ENCRYPTION_KEY).toString();
};

// Function to decrypt data
const decryptData = (encryptedData) => {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
    return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
  } catch (error) {
    console.error("Decryption error:", error);
    return null;
  }
};

// Function to filter user data
const filterUserData = (userData) => {
  return {
    id: userData.id,
    firstName: userData.firstName,
    lastName: userData.lastName,
    email: userData.email,
    image: userData.image || "default-avatar.jpg",
    phone: userData.phone || null,
    street: userData.street || null,
    city: userData.city || null,
    postalCode: userData.postalCode || null,
    country: userData.country || null,
    region: userData.region || null,
    image: userData.image || "default-avatar.jpg",
  };
};

// Utility function to get decrypted user data
const getDecryptedUserData = () => {
  try {
    const storedData = localStorage.getItem("userData");
    if (!storedData) return null;
    return decryptData(storedData);
  } catch (error) {
    console.error("Error getting decrypted user data:", error);
    return null;
  }
};

// Utility function to get and validate token
const getValidToken = () => {
  try {
    const storedToken = localStorage.getItem("token");
    if (!storedToken) return null;

    const decodedToken = jwtDecode(storedToken);
    const currentTime = Date.now() / 1000;

    if (decodedToken.exp < currentTime) {
      return null;
    }

    return storedToken;
  } catch (error) {
    console.error("Error validating token:", error);
    return null;
  }
};

export const AuthContext = createContext({
  isLoggedIn: false,
  user: null,
  token: null,
  login: () => {},
  logout: () => {},
  getUserData: () => null,
  setUserData: () => {},
});

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const router = useRouter();

  const clearAuth = useCallback(
    (shouldRedirect = true) => {
      setToken(null);
      setUser(null);
      try {
        localStorage.removeItem("userData");
        localStorage.removeItem("token");
      } catch (_) {}
      if (shouldRedirect) router.replace("/");
    },
    []
  );

  const logout = useCallback(() => {
    clearAuth(true);
  }, [clearAuth]);

  const login = useCallback(
    (userData, tokenData) => {
      try {
        // Decode token to check expiration
        const decodedToken = jwtDecode(tokenData);
        const currentTime = Date.now() / 1000;

        if (decodedToken.exp < currentTime) {
          toast.error("Session expired. Please login again.");
          logout();
          return;
        }

        // Filter and encrypt user data
        const filteredUserData = filterUserData(userData);
        const encryptedUserData = encryptData(filteredUserData);

        // Store in state
        setToken(tokenData);
        setUser(filteredUserData);

        // Store in localStorage
        localStorage.setItem("userData", encryptedUserData);
        localStorage.setItem("token", tokenData);

        // Set default axios header
        axios.defaults.headers.common["Authorization"] = `Bearer ${tokenData}`;
      } catch (error) {
        console.error("Error during login:", error);
        toast.error("Error during login. Please try again.");
        logout();
      }
    },
    [logout]
  );

  // Function to get current user data
  const getUserData = useCallback(() => {
    return getDecryptedUserData();
  }, []);

  const setUserData = (newUserData) => {
    const updatedUser = { ...user, ...newUserData };
    const filteredUserData = filterUserData(updatedUser);
    const encrypted = encryptData(filteredUserData);
    localStorage.setItem("userData", encrypted);
    setUser(updatedUser);
  };

  // Check token expiration on mount and periodically
  useEffect(() => {
    const checkTokenExpiration = () => {
      const validToken = getValidToken();
      if (!validToken) {
        const path = router?.pathname || "";
        // Redirect only on protected routes; keep public routes in place (e.g., category/product pages)
        const isProtected =
          path.startsWith("/account") ||
          path.startsWith("/wishlist") ||
          path.startsWith("/checkout");
        if (isProtected) {
          toast.error("Session expired. Please login again.");
        }
        // On protected pages: redirect home; on public pages: just clear auth without redirect
        clearAuth(isProtected);
      }
    };

    // Check immediately
    checkTokenExpiration();

    // Check every 5 minutes
    const interval = setInterval(checkTokenExpiration, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [clearAuth]);

  // Initialize auth state from localStorage
  useEffect(() => {
    setAuthLoading(true);
    try {
      const decryptedUserData = getDecryptedUserData();
      const validToken = getValidToken();

      if (decryptedUserData && validToken) {
        // Set state
        setUser(decryptedUserData);
        setToken(validToken);

        // Set default axios header
        axios.defaults.headers.common["Authorization"] = `Bearer ${validToken}`;
      } else {
        // When there is no valid token at startup, clear without redirecting.
        // Public pages (e.g., reset-password) should not bounce to home.
        clearAuth(false);
      }
    } catch (error) {
      console.error("Error initializing auth state:", error);
      clearAuth(false);
    } finally {
      setAuthLoading(false);
    }
  }, [clearAuth]);

  const value = {
    isLoggedIn: !!token,
    user,
    token,
    login,
    logout,
    getUserData,
    authLoading,
    setUserData,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
