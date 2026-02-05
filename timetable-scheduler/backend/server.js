import dotenv from 'dotenv';

dotenv.config({ path: './config.env' });

import app from "./app.js";
import pool from "./db.js";

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});