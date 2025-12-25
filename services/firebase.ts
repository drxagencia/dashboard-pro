import { initializeApp } from "firebase/app";
import * as database from "firebase/database";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCnTKk4-WSvSpoy0onqWBTDLqDfY9oaEdE",
  authDomain: "drxagencia-6ce0a.firebaseapp.com",
  databaseURL: "https://drxagencia-6ce0a-default-rtdb.firebaseio.com",
  projectId: "drxagencia-6ce0a",
  storageBucket: "drxagencia-6ce0a.firebasestorage.app",
  messagingSenderId: "251757919420",
  appId: "1:251757919420:web:26a49c29d0bab8cafca4b9",
  measurementId: "G-V3L12DWZL5"
};

const app = initializeApp(firebaseConfig);
export const db = database.getDatabase(app);
export const auth = getAuth(app);

// Helper to find company ID by owner email
export const findCompanyIdByEmail = async (email: string): Promise<string | null> => {
  try {
    const dbRef = database.ref(db);
    const snapshot = await database.get(database.child(dbRef, "empresas"));
    if (snapshot.exists()) {
      const allCompanies = snapshot.val();
      for (const [id, data] of Object.entries(allCompanies)) {
        // @ts-ignore - Dynamic data structure
        if (data.config && data.config.email_dono === email) {
          return id;
        }
      }
    }
    return null;
  } catch (error) {
    console.error("Error finding company:", error);
    throw error;
  }
};

export const updateOrderStatus = async (companyId: string, orderId: string, status: string) => {
  const updates: any = {};
  updates[`empresas/${companyId}/pedidos/${orderId}/status`] = status;
  return database.update(database.ref(db), updates);
};

export const toggleStockItem = async (path: string, status: boolean) => {
  return database.update(database.ref(db, path), { disponivel: status });
};