// server.js
const http = require("http");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const app = require("./app");

dotenv.config();

// Connect DB
connectDB();

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("Shutting down server...");
  server.close(() => process.exit(0));
});



