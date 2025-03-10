"use server";
import mongoose from "mongoose";

declare global {
  var mongoose: {
    conn: typeof mongoose | null;
    promise: any;
  };
}

if (!global.mongoose) {
  global.mongoose = {
    conn: null,
    promise: null,
  };
}

const MONGODB_URI = process.env.MONGODB_URI || "";

if (!MONGODB_URI) {
  throw new Error(
    "Please define the MONGODB_URI environment variable inside .env"
  );
}

export async function dbConnect() {
  try {
    // If we have a connection, return it
    if (global.mongoose.conn) { 
      return global.mongoose.conn;
    }

    // If we have a pending connection promise, return it
    if (global.mongoose.promise) {
      console.log("MongoDB pending connection promise, returning it");
      return await global.mongoose.promise;
    }

    // Set up connection options with optimized settings for Next.js 14
    const opts = {
      bufferCommands: false,
      maxPoolSize: 5, // Increased for better concurrent request handling
      maxIdleTimeMS: 30000, // Reduced to free up resources faster
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4, // Use IPv4, skip trying IPv6
    };

    // Create new connection promise
    global.mongoose.promise = mongoose.connect(MONGODB_URI, opts);
    global.mongoose.conn = await global.mongoose.promise;

    // Handle connection events
    mongoose.connection.on("connected", () => {
      console.log("MongoDB connected successfully");
    });

    mongoose.connection.on("error", (err) => {
      console.error("MongoDB connection error:", err);
    });

    // Handle process termination
    ["SIGTERM", "SIGINT"].forEach((signal) => {
      process.on(signal, async () => {
        await mongoose.connection.close();
        process.exit(0);
      });
    });

    console.log("MongoDB connection successful, returning connection");
    return global.mongoose.conn;
  } catch (error) {
    console.error("MongoDB connection error:", error);
    throw new Error("Failed to connect to MongoDB");
  }
}

// Only export disconnect for testing purposes
export async function disconnect() {
  if (!global.mongoose.conn) return;
  
  await mongoose.connection.close();
  global.mongoose.conn = null;
  global.mongoose.promise = null;
}

// "use server";
// import mongoose from "mongoose";

// declare global {
//   var mongoose: {
//     conn: any;
//     promise: any;
//   };
// }
// global.mongoose = {
//   conn: null,
//   promise: null,
// };

// // Function to connect to the database
// export async function dbConnect() {
//   try {
//     if (global.mongoose && global.mongoose.conn) {
//       return global.mongoose.conn;
//     } else {
//       const conString = process.env.MONGODB_URI || "";

//       const promise = mongoose.connect(conString, {
//         maxPoolSize: 2,
//         maxIdleTimeMS: 60000,
//         bufferCommands: false,
//         serverSelectionTimeoutMS: 8000, //Stay within Vercel's 10 second function limit
//         heartbeatFrequencyMS: 10000, //Attempting to see if this reduces query timeouts
//       });

//       global.mongoose = {
//         conn: await promise,
//         promise,
//       };
//       return await promise;
//     }
//   } catch (error) {
//     console.error("Error connecting to the database:", error);
//     // throw new Error("Database connection failed");
//   }
// }

// // Function to disconnect from the database
// export const disconnect = () => {
//   if (!global.mongoose.conn) {
//     return;
//   }
//   global.mongoose.conn = null;
//   mongoose.disconnect();
// };