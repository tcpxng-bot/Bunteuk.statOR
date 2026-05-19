// src/contexts/AuthContext.tsx
"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updatePassword,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { UserDoc, Role } from "@/types/database";

interface AuthState {
  user: User | null;
  userDoc: UserDoc | null;
  loading: boolean;
  error: string | null;
}

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  changePassword: (newPassword: string) => Promise<void>;
  hasRole: (role: Role) => boolean;
  hasAnyRole: (roles: Role[]) => boolean;
  isSuperAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    userDoc: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDocRef = doc(db, "users", firebaseUser.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const userData = userDocSnap.data() as UserDoc;
            if (!userData.isActive) {
              await firebaseSignOut(auth);
              setState({
                user: null,
                userDoc: null,
                loading: false,
                error: "บัญชีถูกระงับ กรุณาติดต่อ admin",
              });
              return;
            }
            setState({
              user: firebaseUser,
              userDoc: userData,
              loading: false,
              error: null,
            });
          } else {
            // User exists in Auth but no Firestore doc — shouldn't happen
            setState({
              user: firebaseUser,
              userDoc: null,
              loading: false,
              error: "ไม่พบข้อมูลผู้ใช้ กรุณาติดต่อ admin",
            });
          }
        } catch (err) {
          setState({
            user: firebaseUser,
            userDoc: null,
            loading: false,
            error: "โหลดข้อมูลผู้ใช้ไม่สำเร็จ",
          });
        }
      } else {
        setState({
          user: null,
          userDoc: null,
          loading: false,
          error: null,
        });
      }
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      const message =
        err.code === "auth/invalid-credential"
          ? "อีเมลหรือรหัสผ่านไม่ถูกต้อง"
          : err.code === "auth/too-many-requests"
            ? "เข้าสู่ระบบบ่อยเกินไป กรุณารอสักครู่"
            : "เข้าสู่ระบบไม่สำเร็จ";
      setState((prev) => ({ ...prev, loading: false, error: message }));
      throw new Error(message);
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  const changePassword = async (newPassword: string) => {
    if (!state.user) throw new Error("ไม่ได้เข้าสู่ระบบ");
    await updatePassword(state.user, newPassword);
  };

  const hasRole = (role: Role): boolean => {
    return state.userDoc?.roles.includes(role) ?? false;
  };

  const hasAnyRole = (roles: Role[]): boolean => {
    return roles.some((role) => state.userDoc?.roles.includes(role)) ?? false;
  };

  const isSuperAdmin = state.userDoc?.roles.includes("super_admin") ?? false;

  return (
    <AuthContext.Provider
      value={{
        ...state,
        signIn,
        signOut,
        changePassword,
        hasRole,
        hasAnyRole,
        isSuperAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
